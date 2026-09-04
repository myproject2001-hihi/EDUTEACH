import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RotateCw, CheckCircle2, Brain, Hand, HelpCircle, Lightbulb, Image as ImageIcon, FileText, Sparkles, ZoomIn, X, Volume2, VolumeX, Music } from 'lucide-react';
import { MarkdownMath } from './MarkdownMath';
import { ParsedQuestionItem, cleanQuestionText } from '../views/AssignmentsView';
import { gameAudio, getSoundConfig, saveSoundConfig } from '../utils/gameAudio';

export interface MemoryFlipGameProps {
  questions: ParsedQuestionItem[];
  onClose: () => void;
  isStudentMode?: boolean;
  onSubmitWork?: (score: number, correctAnswers: number, answersMap: Record<string, number>) => void;
}

export type CardVariant = 'text_only' | 'image_only' | 'image_text';

export interface CardItem {
  uid: string;      // Unique instance ID for rendering
  pairId: string;   // Identifier for matching pair
  type: 'q' | 'a';  // Question card or Answer card
  content: string;  // Text or LaTeX string
  img?: string;     // Optional image URL
  cardVariant: CardVariant;
  isFlipped: boolean;
  isMatched: boolean;
  isShaking: boolean;
}

interface LearningPair {
  id: string;
  q: string;
  a: string;
  qImg?: string;
  aImg?: string;
}

/**
 * Utility to extract image URLs and clean text from markdown, custom tags, or raw URLs
 */
export function parseImageAndText(input: string, fallbackImg?: string): { text: string; img?: string; variant: CardVariant } {
  let str = (input || '').trim();
  let img = fallbackImg ? fallbackImg.trim() : undefined;

  // 1. Markdown image syntax: ![alt](url)
  const mdImgMatch = str.match(/!\[(.*?)\]\((https?:\/\/[^\s\)]+|data:image\/[^\s\)]+)\)/i);
  if (mdImgMatch) {
    if (!img) img = mdImgMatch[2].trim();
    const altText = mdImgMatch[1].trim();
    str = str.replace(mdImgMatch[0], '').trim();
    if (!str && altText && altText !== 'image' && altText !== 'img' && altText !== 'Hình ảnh') {
      str = altText;
    }
  }

  // 2. Custom tags: [img: url] or [image: url]
  const tagImgMatch = str.match(/\[(?:img|image):\s*(https?:\/\/[^\s\]]+|data:image\/[^\s\]]+)\]/i);
  if (tagImgMatch) {
    if (!img) img = tagImgMatch[1].trim();
    str = str.replace(tagImgMatch[0], '').trim();
  }

  // 3. Direct image URLs as sole content
  const pureUrlMatch = str.match(/^(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s]*)?)$/i);
  if (pureUrlMatch) {
    if (!img) img = pureUrlMatch[1].trim();
    str = '';
  }

  let variant: CardVariant = 'text_only';
  if (img && !str) {
    variant = 'image_only';
  } else if (img && str) {
    variant = 'image_text';
  } else {
    variant = 'text_only';
  }

  return { text: str, img, variant };
}

// Fallback Educational Pairs showcasing All 3 Types: Text-only, Image+Text, Image-only
const DEFAULT_LEARNING_PAIRS: LearningPair[] = [
  // 1. Dạng Hình ảnh + Text ghép với Text (Quốc kỳ & Tên nước -> Thủ đô)
  {
    id: 'pair1',
    q: "Việt Nam",
    qImg: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&auto=format&fit=crop&q=80",
    a: "Hà Nội"
  },
  // 2. Dạng Hình ảnh thuần ghép với Tên loài động vật (Image -> Text)
  {
    id: 'pair2',
    q: "",
    qImg: "https://images.unsplash.com/photo-1614027164847-1b28caa1470f?w=400&auto=format&fit=crop&q=80",
    a: "Sư tử dũng mãnh"
  },
  // 3. Dạng Text thuần công thức Toán học
  {
    id: 'pair3',
    q: "7 \\times 8 = ?",
    a: "56"
  },
  // 4. Dạng Hình ảnh + Text ghép với Hình ảnh + Text
  {
    id: 'pair4',
    q: "Tháp Eiffel",
    qImg: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&auto=format&fit=crop&q=80",
    a: "Thủ đô Paris (Pháp)",
    aImg: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&auto=format&fit=crop&q=80"
  },
  // 5. Dạng Text thuần Hóa học
  {
    id: 'pair5',
    q: "Công thức phân tử của Nước",
    a: "\\text{H}_2\\text{O}"
  },
  // 6. Dạng Hình ảnh thuần ghép với Tên địa danh
  {
    id: 'pair6',
    q: "",
    qImg: "https://images.unsplash.com/photo-1528164344705-475426879c0d?w=400&auto=format&fit=crop&q=80",
    a: "Núi Phú Sĩ (Nhật Bản)"
  }
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
            if (mp.left || mp.right || (mp as any).leftImg || (mp as any).rightImg) {
              const leftParsed = parseImageAndText(mp.left || '', (mp as any).leftImg);
              const rightParsed = parseImageAndText(mp.right || '', (mp as any).rightImg);

              pairs.push({
                id: `q_${idx}_mp_${mpIdx}`,
                q: leftParsed.text,
                qImg: leftParsed.img,
                a: rightParsed.text,
                aImg: rightParsed.img
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

          if (rawQ || rawA) {
            const parsedQ = parseImageAndText(rawQ, (q as any).image || (q as any).imageUrl || (q as any).thumb);
            const parsedA = parseImageAndText(rawA);

            pairs.push({
              id: `q_${idx}`,
              q: parsedQ.text,
              qImg: parsedQ.img,
              a: parsedA.text,
              aImg: parsedA.img
            });
          }
        }
      });
    }

    // Fallback ONLY when teacher provided NO questions/pairs at all
    if (pairs.length === 0) {
      DEFAULT_LEARNING_PAIRS.forEach(dp => {
        pairs.push(dp);
      });
    }

    return {
      topic: extractedTopic,
      learningPairs: pairs
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
  const [zoomedImage, setZoomedImage] = useState<{ src: string; caption?: string } | null>(null);
  const [soundConfig, setSoundConfig] = useState(getSoundConfig);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync sound configuration changes
  useEffect(() => {
    const handleSoundChange = (e: any) => {
      if (e.detail) setSoundConfig(e.detail);
    };
    window.addEventListener('game-sound-config-changed', handleSoundChange);
    return () => {
      window.removeEventListener('game-sound-config-changed', handleSoundChange);
    };
  }, []);

  // Background music management for Memory Flip
  useEffect(() => {
    if (!isWinModalOpen) {
      gameAudio.startBgm('puzzle');
    } else {
      gameAudio.stopBgm();
    }
    return () => {
      gameAudio.stopBgm();
    };
  }, [isWinModalOpen]);

  const toggleSound = () => {
    const nextMaster = !soundConfig.masterEnabled;
    const updated = saveSoundConfig({ masterEnabled: nextMaster });
    setSoundConfig(updated);
  };

  const toggleBgm = () => {
    const nextBgm = !soundConfig.bgmEnabled;
    const updated = saveSoundConfig({ bgmEnabled: nextBgm });
    setSoundConfig(updated);
    if (nextBgm && soundConfig.masterEnabled && !isWinModalOpen) {
      gameAudio.startBgm('puzzle');
    } else {
      gameAudio.stopBgm();
    }
  };

  // Initialize Game
  const initGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const generatedCards: CardItem[] = [];
    learningPairs.forEach(pair => {
      const qParsed = parseImageAndText(pair.q, pair.qImg);
      const aParsed = parseImageAndText(pair.a, pair.aImg);

      // Question card
      generatedCards.push({
        uid: `${pair.id}_q`,
        pairId: pair.id,
        type: 'q',
        content: qParsed.text,
        img: qParsed.img,
        cardVariant: qParsed.variant,
        isFlipped: false,
        isMatched: false,
        isShaking: false
      });

      // Answer card
      generatedCards.push({
        uid: `${pair.id}_a`,
        pairId: pair.id,
        type: 'a',
        content: aParsed.text,
        img: aParsed.img,
        cardVariant: aParsed.variant,
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
        cancelAnimationFrame(timerRef.current as any);
      }
      gameAudio.stopBgm();
    };
  }, [learningPairs]);

  // Timer Effect using requestAnimationFrame
  useEffect(() => {
    if (gameStarted && !isWinModalOpen) {
      let lastTime = performance.now();
      let animFrameId: number;

      const step = (now: number) => {
        if (now - lastTime >= 1000) {
          lastTime = now;
          setTimeElapsed(prev => prev + 1);
        }
        animFrameId = requestAnimationFrame(step);
        timerRef.current = animFrameId as any;
      };

      animFrameId = requestAnimationFrame(step);
      timerRef.current = animFrameId as any;

      return () => {
        cancelAnimationFrame(animFrameId);
      };
    } else if (timerRef.current) {
      cancelAnimationFrame(timerRef.current as any);
    }
  }, [gameStarted, isWinModalOpen]);

  // Handle Card Click
  const handleCardClick = (card: CardItem) => {
    if (isLockBoard) return;
    if (card.isFlipped || card.isMatched) return;

    gameAudio.playCardFlip();

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
    const firstCard = cards.find(c => c.uid === firstCardUid);
    const secondCard = card;

    if (!firstCard) return;

    // Check Match
    const isMatch =
      firstCard.pairId === secondCard.pairId && firstCard.type !== secondCard.type;

    if (isMatch) {
      // Success match
      setTimeout(() => {
        gameAudio.playMatchSuccess();
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
            gameAudio.stopBgm();
            gameAudio.playVictory();
            setIsWinModalOpen(true);
          }, 500);
        }
      }, 300);
    } else {
      // Wrong match: Shake and Flip Back
      setTimeout(() => {
        gameAudio.playMatchFail();
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
        .shake-anim {
          animation: shakeError 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        @keyframes shakeError {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .match-pop {
          animation: matchSuccess 0.5s ease-out forwards;
        }
        @keyframes matchSuccess {
          0% { transform: scale(1); }
          50% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* TOP HEADER BAR */}
      <div className="p-2 sm:p-3 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between gap-2 sm:gap-4 shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-800 uppercase tracking-wide truncate">
              Lật Mảnh Ghép Kiến Thức
            </h1>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate max-w-[150px] sm:max-w-xs md:max-w-md">
              {topic}
            </p>
          </div>
        </div>

        {/* STATUS COUNTERS & CONTROLS */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Time Elapsed */}
          <div className="bg-indigo-50 border border-indigo-200/80 px-2 sm:px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-2xs">
            <span className="text-[10px] sm:text-xs font-bold text-indigo-700/80 hidden xs:inline">⏱️</span>
            <span className="font-mono font-black text-indigo-600 text-xs sm:text-sm">{formatTime(timeElapsed)}</span>
          </div>

          {/* Moves */}
          <div className="bg-rose-50 border border-rose-200/80 px-2 sm:px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-2xs">
            <Hand className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="text-[10px] sm:text-xs font-bold text-rose-700/80 hidden xs:inline">Lượt:</span>
            <span className="font-black text-rose-600 text-xs sm:text-sm">{moves}</span>
          </div>

          {/* Matches */}
          <div className="bg-emerald-50 border border-emerald-200/80 px-2 sm:px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-[10px] sm:text-xs font-bold text-emerald-700/80 hidden xs:inline">Khớp:</span>
            <span className="font-black text-emerald-600 text-xs sm:text-sm">
              {matchedPairsCount}/{learningPairs.length}
            </span>
          </div>

          {/* BGM Toggle */}
          <button
            type="button"
            onClick={toggleBgm}
            className={`p-1.5 rounded-xl border transition active:scale-95 flex items-center justify-center ${
              soundConfig.masterEnabled && soundConfig.bgmEnabled
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
            title={soundConfig.bgmEnabled ? 'Nhạc nền: BẬT' : 'Nhạc nền: TẮT'}
          >
            <Music className={`w-3.5 h-3.5 ${soundConfig.masterEnabled && soundConfig.bgmEnabled ? 'animate-pulse' : 'opacity-40'}`} />
          </button>

          {/* Master Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-1.5 rounded-xl border transition active:scale-95 flex items-center justify-center ${
              soundConfig.masterEnabled
                ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                : 'bg-rose-50 text-rose-500 border-rose-200'
            }`}
            title={soundConfig.masterEnabled ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT'}
          >
            {soundConfig.masterEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* MAIN CARDS GRID */}
      <div className="flex-1 min-h-0 p-2 sm:p-3 md:p-4 flex items-center justify-center overflow-hidden z-10 w-full h-full">
        {(() => {
          const totalCards = cards.length;
          let gridClasses = 'grid-cols-2 sm:grid-cols-2';
          let containerMaxWidth = 'max-w-md';

          if (totalCards <= 2) {
            gridClasses = 'grid-cols-2 sm:grid-cols-2';
            containerMaxWidth = 'max-w-sm';
          } else if (totalCards <= 4) {
            gridClasses = 'grid-cols-2 sm:grid-cols-2';
            containerMaxWidth = 'max-w-md sm:max-w-lg';
          } else if (totalCards <= 6) {
            gridClasses = 'grid-cols-2 sm:grid-cols-3';
            containerMaxWidth = 'max-w-lg sm:max-w-2xl';
          } else if (totalCards <= 8) {
            gridClasses = 'grid-cols-2 sm:grid-cols-4';
            containerMaxWidth = 'max-w-lg sm:max-w-3xl';
          } else if (totalCards <= 12) {
            gridClasses = 'grid-cols-3 sm:grid-cols-4';
            containerMaxWidth = 'max-w-xl sm:max-w-4xl';
          } else {
            gridClasses = 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6';
            containerMaxWidth = 'max-w-5xl';
          }

          return (
            <div className={`w-full h-full ${containerMaxWidth} max-h-full mx-auto flex flex-col justify-center items-center`}>
              <div
                className={`grid ${gridClasses} gap-2 sm:gap-3 w-full h-full max-h-full justify-center items-stretch perspective-1000 p-1 auto-rows-fr`}
              >
                {cards.map(card => {
                  const isFlipped = card.isFlipped || card.isMatched;

                  return (
                    <div
                      key={card.uid}
                      onClick={() => handleCardClick(card)}
                      className={`w-full h-full min-h-[90px] sm:min-h-[110px] relative cursor-pointer select-none rounded-xl sm:rounded-2xl ${
                        card.isShaking ? 'shake-anim' : ''
                      }`}
                    >
                      <div
                        className="w-full h-full relative rounded-xl sm:rounded-2xl shadow-md"
                        style={{
                          perspective: '1000px'
                        }}
                      >
                        {/* BACK FACE (KHI ÚP THẺ) */}
                        <div
                          className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 border-2 border-indigo-300/40 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center p-2 text-white shadow-sm hover:shadow-indigo-500/25 hover:scale-[1.01] transition-all duration-500"
                          style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            opacity: isFlipped ? 0 : 1,
                            pointerEvents: isFlipped ? 'none' : 'auto',
                            zIndex: isFlipped ? 1 : 2
                          }}
                        >
                          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white/90 shadow-inner mb-0.5 sm:mb-1">
                            <Brain className="w-4 h-4 sm:w-5 sm:h-5 opacity-90" />
                          </div>
                          <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-indigo-100/80">
                            Ghép Nối
                          </span>
                        </div>

                        {/* FRONT FACE (KHI LẬT THẺ) - Luôn hiển thị xuôi chiều tự nhiên (rotateY(0deg)) */}
                        <div
                          className={`absolute inset-0 w-full h-full rounded-xl sm:rounded-2xl border-2 p-1.5 sm:p-2 flex flex-col items-center justify-between text-center overflow-hidden transition-all duration-500 ${
                            card.isMatched
                              ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900 match-pop shadow-md shadow-emerald-500/10'
                              : 'bg-white border-slate-200 text-slate-800 shadow-md'
                          }`}
                          style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                            opacity: isFlipped ? 1 : 0,
                            pointerEvents: isFlipped ? 'auto' : 'none',
                            zIndex: isFlipped ? 2 : 1
                          }}
                        >
                          {/* Card Type Header Tag - Sleek & Compact */}
                          <div className="w-full flex items-center justify-between gap-1 shrink-0 px-0.5">
                            <div
                              className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
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

                            {/* Match Indicator Checkmark */}
                            {card.isMatched && (
                              <div className="text-emerald-600 font-extrabold text-[8px] sm:text-[9px] flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span className="hidden xs:inline">Khớp</span>
                              </div>
                            )}
                          </div>

                          {/* Card Body Content with 3 Variants */}
                          <div className="flex-1 w-full min-h-0 flex flex-col items-center justify-center my-0.5 overflow-hidden">
                            {/* DẠNG 1: HÌNH ẢNH THUẦN (Image Only) */}
                            {card.cardVariant === 'image_only' && card.img && (
                              <div className="w-full h-full flex-1 min-h-0 relative flex items-center justify-center p-0.5 group/img overflow-hidden">
                                <img
                                  src={card.img}
                                  alt="Card"
                                  referrerPolicy="no-referrer"
                                  className="max-h-full max-w-full w-auto h-auto object-contain rounded-lg transition-transform group-hover/img:scale-105"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setZoomedImage({ src: card.img!, caption: card.type === 'q' ? 'Mảnh ghép câu hỏi' : 'Mảnh ghép đáp án' });
                                  }}
                                  className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 text-white rounded-md opacity-0 group-hover/img:opacity-100 transition-opacity shadow-sm"
                                  title="Phóng to ảnh"
                                >
                                  <ZoomIn className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {/* DẠNG 2: HÌNH ẢNH + VĂN BẢN (Image + Text) - Không bao giờ bị tràn hình che mất chữ */}
                            {card.cardVariant === 'image_text' && (
                              <div className="w-full h-full flex-1 min-h-0 flex flex-col items-center justify-between gap-1 overflow-hidden">
                                {card.img && (
                                  <div className="w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden relative group/img">
                                    <img
                                      src={card.img}
                                      alt="Thumbnail"
                                      referrerPolicy="no-referrer"
                                      className="max-h-full max-w-full w-auto h-auto object-contain rounded-md"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setZoomedImage({ src: card.img!, caption: card.content });
                                      }}
                                      className="absolute top-0.5 right-0.5 p-1 bg-black/50 hover:bg-black/70 text-white rounded opacity-0 group-hover/img:opacity-100 transition-opacity"
                                      title="Phóng to ảnh"
                                    >
                                      <ZoomIn className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                                {card.content && (
                                  <div className="shrink-0 w-full text-center px-1 pb-0.5 text-[11px] sm:text-xs md:text-sm font-extrabold text-slate-800 leading-tight break-words max-w-full line-clamp-2">
                                    <MarkdownMath content={card.content} />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* DẠNG 3: VĂN BẢN THUẦN (Text Only) */}
                            {card.cardVariant === 'text_only' && (
                              <div className="w-full h-full flex-1 min-h-0 flex items-center justify-center px-1 py-1 overflow-y-auto custom-scrollbar">
                                <div className="text-xs sm:text-sm md:text-base font-extrabold leading-snug break-words max-w-full text-slate-800 text-center">
                                  <MarkdownMath content={card.content} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* IMAGE ZOOM MODAL */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="bg-white rounded-2xl p-4 max-w-lg w-full shadow-2xl flex flex-col items-center gap-3 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 right-3 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={zoomedImage.src}
              alt="Zoomed Card Preview"
              referrerPolicy="no-referrer"
              className="max-h-[60vh] max-w-full object-contain rounded-xl border border-slate-200 shadow-sm"
            />
            {zoomedImage.caption && (
              <div className="text-sm font-bold text-slate-700 text-center px-2">
                <MarkdownMath content={zoomedImage.caption} />
              </div>
            )}
          </div>
        </div>
      )}

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
