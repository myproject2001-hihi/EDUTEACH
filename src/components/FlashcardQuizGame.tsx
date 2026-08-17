import React, { useState, useMemo } from 'react';
import { Sparkles, CheckCircle2, XCircle, ArrowRight, RotateCw, Trophy, Award, BookOpen, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MarkdownMath } from './MarkdownMath';

export interface FlashcardQuizItem {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  points: number;
  solutionText?: string;
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface Props {
  assignmentTitle: string;
  flashcards?: Flashcard[];
  questions?: any[];
  studentName: string;
  onFinish: (score: number, correctCount: number, answersMap: Record<string, number>) => void;
  onExit: () => void;
}

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function FlashcardQuizGame({
  assignmentTitle,
  flashcards = [],
  questions = [],
  studentName,
  onFinish,
  onExit
}: Props) {
  // 1. Build quiz questions list with randomized options
  const quizItems: FlashcardQuizItem[] = useMemo(() => {
    // If structured questions already exist, use them and randomize their option order
    if (questions && questions.length > 0) {
      return questions.map((q, idx) => {
        const rawOpts: string[] = (q.options && q.options.length > 0) ? [...q.options] : ['A', 'B', 'C', 'D'];
        const correctIdxOrig = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
        const correctOptionValue = rawOpts[correctIdxOrig] ?? rawOpts[0];
        
        // Randomize option positions
        const shuffledOpts = shuffle(rawOpts);
        const newCorrectIdx = shuffledOpts.indexOf(correctOptionValue);

        return {
          id: q.id || `q_${idx}`,
          question: q.question,
          options: shuffledOpts,
          correctAnswer: newCorrectIdx >= 0 ? newCorrectIdx : 0,
          points: q.points || 10 / questions.length,
          solutionText: q.solutionText || ''
        };
      });
    }

    // Otherwise, generate 4-option questions dynamically from flashcards
    const validCards = flashcards.filter(c => c.front.trim() && c.back.trim());
    if (validCards.length === 0) {
      return [
        {
          id: 'fc_fallback_1',
          question: 'Chúc mừng bạn đã hoàn thành việc ôn tập bộ thẻ flashcard!',
          options: ['Đồng ý', 'Xác nhận', 'Hoàn thành', 'Tuyệt vời'],
          correctAnswer: 0,
          points: 10,
          solutionText: ''
        }
      ];
    }

    const allBacks = validCards.map(c => c.back);

    return validCards.map((card, idx) => {
      // Find 3 distractors from other flashcards
      const otherBacks = allBacks.filter(b => b !== card.back);
      const shuffledOthers = shuffle(otherBacks);
      const distractors = shuffledOthers.slice(0, 3);

      // If not enough cards for 4 options, fill with smart fallbacks
      while (distractors.length < 3) {
        distractors.push(`Đáp án phụ ${distractors.length + 1}`);
      }

      // 4 choices total - completely randomized positions
      const rawOptions = [card.back, ...distractors];
      const randomizedOptions = shuffle(rawOptions);
      const correctIdx = randomizedOptions.indexOf(card.back);

      return {
        id: card.id || `fc_${idx}`,
        question: card.front,
        options: randomizedOptions,
        correctAnswer: correctIdx >= 0 ? correctIdx : 0,
        points: 10 / validCards.length,
        solutionText: ''
      };
    });
  }, [flashcards, questions]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<string, number>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQ = quizItems[currentIndex] || quizItems[0];
  const totalQuestions = quizItems.length;

  const handleSelectOption = (index: number) => {
    if (isAnswerSubmitted || isCompleted) return;

    setSelectedIndex(index);
    setIsAnswerSubmitted(true);

    const isCorrect = index === currentQ.correctAnswer;
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });
    }

    setAnswersMap(prev => ({
      ...prev,
      [currentQ.id]: index
    }));
  };

  const handleNextQuestion = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedIndex(null);
      setIsAnswerSubmitted(false);
    } else {
      setIsCompleted(true);
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 }
      });
    }
  };

  const finalScore = useMemo(() => {
    if (totalQuestions === 0) return 10;
    return Math.round((correctCount / totalQuestions) * 10);
  }, [correctCount, totalQuestions]);

  if (isCompleted) {
    return (
      <div className="fixed inset-0 z-[10000] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-amber-200">
            <Trophy className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full">
              <Sparkles className="w-3.5 h-3.5" /> Hoàn thành bài kiểm tra Flashcard!
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {finalScore >= 8 ? 'Xuất Sắc! 🎉' : finalScore >= 5 ? 'Làm Tốt Lắm! 👏' : 'Cần Ôn Tập Thêm! 💪'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Học sinh: <strong className="text-slate-800">{studentName}</strong> • {assignmentTitle}
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 grid grid-cols-2 gap-4">
            <div className="border-r border-slate-200 pr-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Điểm số</p>
              <p className="text-3xl sm:text-4xl font-black text-indigo-600">{finalScore}<span className="text-sm font-bold text-slate-400">/10</span></p>
            </div>
            <div className="pl-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Đúng</p>
              <p className="text-3xl sm:text-4xl font-black text-emerald-600">{correctCount}<span className="text-sm font-bold text-slate-400">/{totalQuestions} câu</span></p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setCurrentIndex(0);
                setSelectedIndex(null);
                setIsAnswerSubmitted(false);
                setCorrectCount(0);
                setAnswersMap({});
                setIsCompleted(false);
              }}
              className="py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <RotateCw className="w-4 h-4" /> Làm lại
            </button>
            <button
              type="button"
              onClick={() => onFinish(finalScore, correctCount, answersMap)}
              className="flex-1 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all uppercase tracking-wider flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" /> <span>Nộp bài & Lưu điểm</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white text-slate-900 w-full max-w-4xl max-h-[94vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="font-extrabold text-xs sm:text-sm truncate">{assignmentTitle}</h4>
              <p className="text-[10px] text-slate-400">Kiểm tra trắc nghiệm kiến thức Flashcard</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold font-mono bg-slate-800 px-3 py-1 rounded-full text-indigo-300 border border-slate-700">
              Câu {currentIndex + 1}/{totalQuestions}
            </span>
            <button
              type="button"
              onClick={onExit}
              className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-full transition-colors"
              title="Thoát kiểm tra"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-1.5 shrink-0">
          <div
            className="bg-indigo-600 h-full transition-all duration-300 rounded-r-full"
            style={{ width: `${((currentIndex + (isAnswerSubmitted ? 1 : 0)) / totalQuestions) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="flex-1 p-4 sm:p-7 overflow-y-auto custom-scrollbar flex flex-col justify-between space-y-4 sm:space-y-6">
          
          {/* Question Box */}
          <div className="bg-gradient-to-br from-indigo-50/60 via-slate-50 to-purple-50/40 border-2 border-indigo-100/80 rounded-2xl p-5 sm:p-7 text-center space-y-2">
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
              Câu hỏi {currentIndex + 1}
            </span>
            <div className="text-base sm:text-xl font-normal text-slate-800 leading-relaxed pt-1">
              <MarkdownMath content={currentQ.question} className="font-normal text-slate-800" />
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {currentQ.options.map((opt, idx) => {
              const letter = ['A', 'B', 'C', 'D'][idx] || `${idx + 1}`;
              const isSelected = selectedIndex === idx;
              const isCorrect = idx === currentQ.correctAnswer;

              let btnStyle = 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-indigo-300 shadow-sm';
              let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';

              if (isAnswerSubmitted) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-md ring-2 ring-emerald-400/40';
                  badgeStyle = 'bg-emerald-600 text-white border-emerald-600';
                } else if (isSelected) {
                  btnStyle = 'bg-rose-50 border-rose-400 text-rose-950 shadow-sm';
                  badgeStyle = 'bg-rose-600 text-white border-rose-600';
                } else {
                  btnStyle = 'bg-slate-50 border-slate-200 text-slate-700';
                  badgeStyle = 'bg-slate-200 text-slate-700 border-slate-300';
                }
              } else if (isSelected) {
                btnStyle = 'bg-indigo-50 border-indigo-600 text-indigo-950 shadow-md';
                badgeStyle = 'bg-indigo-600 text-white border-indigo-600';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnswerSubmitted}
                  onClick={() => handleSelectOption(idx)}
                  className={`p-4 sm:p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-3.5 min-h-[68px] sm:min-h-[76px] active:scale-[0.99] ${btnStyle}`}
                >
                  <span className={`w-8 h-8 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center shrink-0 border transition-colors ${badgeStyle}`}>
                    {letter}
                  </span>
                  
                  <div className="flex-1 text-xs sm:text-sm font-medium leading-relaxed overflow-x-auto custom-scrollbar">
                    <MarkdownMath content={opt} className="text-inherit font-medium" />
                  </div>

                  {/* Reserved space for feedback icon to prevent text layout jumping */}
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    {isAnswerSubmitted && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    {isAnswerSubmitted && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Solution / Explanation Box (if available) */}
          {isAnswerSubmitted && currentQ.solutionText && (
            <div className="p-3.5 sm:p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs sm:text-sm text-slate-800 space-y-1 animate-in fade-in">
              <p className="text-[11px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>💡</span> Hướng dẫn giải:
              </p>
              <div className="text-slate-700 leading-relaxed font-normal">
                <MarkdownMath content={currentQ.solutionText} />
              </div>
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="pt-3 min-h-[52px] flex items-center justify-between border-t border-slate-100 gap-3">
            <div className="text-xs sm:text-sm font-semibold text-slate-600 flex-1">
              {isAnswerSubmitted ? (
                selectedIndex === currentQ.correctAnswer ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Chính xác! Tuyệt vời.
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold flex items-center gap-1.5 animate-in fade-in">
                    <XCircle className="w-4 h-4 shrink-0" /> Chưa đúng rồi. Đáp án đúng là {['A', 'B', 'C', 'D'][currentQ.correctAnswer]}.
                  </span>
                )
              ) : (
                <span className="text-slate-400">👉 Nhấp vào phương án bạn cho là đúng</span>
              )}
            </div>

            {isAnswerSubmitted && (
              <button
                type="button"
                onClick={handleNextQuestion}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
              >
                <span>{currentIndex < totalQuestions - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
