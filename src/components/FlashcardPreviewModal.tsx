import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, RotateCw, Eye, Shuffle, Sparkles, AlertCircle } from 'lucide-react';
import { MarkdownMath } from './MarkdownMath';
import { motion } from 'motion/react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  image?: string;
  frontImage?: string;
  backImage?: string;
}

interface Props {
  flashcards: Flashcard[];
  title?: string;
  onClose: () => void;
}

export function FlashcardPreviewModal({ flashcards, title = 'Xem trước bộ Flashcard', onClose }: Props) {
  // Filter out completely empty flashcards for preview, or use all
  const validCards = flashcards.filter(c => c.front.trim() || c.back.trim());
  const displayCards = validCards.length > 0 ? validCards : flashcards;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<number[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);

  // Initialize order array
  useEffect(() => {
    setShuffledOrder(displayCards.map((_, i) => i));
  }, [displayCards.length]);

  const activeIndex = isShuffled && shuffledOrder.length === displayCards.length
    ? shuffledOrder[currentIndex]
    : currentIndex;

  const activeCard = displayCards[activeIndex] || { id: 'empty', front: '', back: '' };

  const handleNext = () => {
    if (currentIndex < displayCards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleToggleFlip = () => {
    setIsFlipped(prev => !prev);
  };

  const handleToggleShuffle = () => {
    if (!isShuffled) {
      // Shuffle array
      const arr = displayCards.map((_, i) => i);
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setShuffledOrder(arr);
      setIsShuffled(true);
      setCurrentIndex(0);
      setIsFlipped(false);
    } else {
      setIsShuffled(false);
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleToggleFlip();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, displayCards.length, isShuffled, shuffledOrder]);

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6">
      <div className="bg-slate-900 text-slate-100 w-full max-w-4xl h-full max-h-[92vh] sm:max-h-[88vh] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-slate-700">
        
        {/* Top Header */}
        <div className="h-14 bg-slate-950 flex items-center justify-between px-4 sm:px-6 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex gap-1.5 shrink-0">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-center gap-2 min-w-0 ml-2 sm:ml-4">
              <Eye className="w-4 h-4 text-indigo-400 shrink-0" />
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-200 uppercase tracking-wider truncate">
                {title}
              </h3>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[11px] font-bold rounded-full border border-indigo-500/30 shrink-0">
                {displayCards.length} thẻ
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex text-[11px] text-slate-400 font-medium bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              Phím: <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-200 font-mono mx-1">◄ ►</kbd> Chuyển thẻ • <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-200 font-mono mx-1">Space</kbd> Lật
            </span>
            <button 
              onClick={onClose} 
              className="p-1.5 bg-slate-800 hover:bg-rose-500 text-slate-400 hover:text-white rounded-full transition-colors group shrink-0"
              title="Đóng xem trước"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>

        {/* Main Interactive Stage */}
        <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
          
          {/* Progress & Quick Actions Bar */}
          <div className="px-4 sm:px-6 pt-3 pb-2 flex items-center justify-between gap-3 shrink-0 border-b border-slate-800/60 bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">
                Thẻ {currentIndex + 1} / {displayCards.length || 1}
              </span>
              <button
                onClick={handleToggleShuffle}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  isShuffled 
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/20' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                }`}
                title="Xáo trộn thứ tự thẻ"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>{isShuffled ? 'Đã xáo' : 'Xáo trộn'}</span>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex-1 max-w-xs bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700 hidden sm:block">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${((currentIndex + 1) / (displayCards.length || 1)) * 100}%` }}
              />
            </div>

            <span className="text-[11px] text-slate-400 font-medium">
              {isFlipped ? '🔄 Đang xem mặt sau' : '👆 Nhấn thẻ để lật'}
            </span>
          </div>

          {/* Empty State vs Interactive Card */}
          {displayCards.length === 0 || (!activeCard.front.trim() && !activeCard.back.trim()) ? (
            <div className="flex-1 bg-slate-800/60 border-2 border-dashed border-slate-700 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 m-4">
              <div className="w-16 h-16 bg-slate-800 text-amber-400 rounded-2xl flex items-center justify-center border border-slate-700">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-200 mb-1">Chưa có nội dung thẻ Flashcard</h4>
                <p className="text-xs text-slate-400 max-w-md">
                  Vui lòng thêm thẻ thủ công hoặc tải từ tệp tin (.txt/.csv) ở màn hình soạn thảo để xem trước.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-center overflow-y-auto custom-scrollbar">
              <motion.div 
                onClick={handleToggleFlip}
                className="w-full max-w-2xl h-[240px] xs:h-[280px] sm:h-[340px] md:h-[380px] perspective-1000 cursor-pointer group relative my-auto"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
              >
                <motion.div 
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                  className="relative w-full h-full transform-style-3d"
                >
                  {/* FRONT SIDE */}
                  <div className="absolute w-full h-full backface-hidden bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-indigo-500/40 group-hover:border-indigo-500 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col justify-between p-4 sm:p-7 transition-colors overflow-hidden">
                    {/* Top Tag */}
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" /> Mặt trước
                      </span>
                      <span className="text-xs font-mono text-slate-400 font-semibold">
                        #{activeIndex + 1}
                      </span>
                    </div>

                    {/* Card Front Content */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-3 px-2 overflow-y-auto custom-scrollbar w-full">
                      {(activeCard.frontImage || activeCard.image) && (
                        <div className="max-h-24 sm:max-h-32 mb-3 shrink-0 rounded-xl overflow-hidden border border-slate-700/80 shadow-md bg-slate-950/40 p-1 flex items-center justify-center">
                          <img 
                            src={activeCard.frontImage || activeCard.image} 
                            alt="Front Illustration" 
                            referrerPolicy="no-referrer"
                            className="max-h-[96px] sm:max-h-[128px] max-w-full object-contain rounded-lg"
                          />
                        </div>
                      )}
                      <div className="text-xl sm:text-3xl font-extrabold text-white leading-relaxed drop-shadow-sm">
                        <MarkdownMath 
                          content={activeCard.front || '(Chưa nhập nội dung mặt trước)'} 
                          className="text-white text-center font-extrabold"
                        />
                      </div>
                    </div>

                    {/* Bottom Hint */}
                    <div className="pt-2.5 border-t border-slate-700/80 text-center flex items-center justify-center gap-2 text-xs font-semibold text-indigo-300 group-hover:text-indigo-200">
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Nhấp để xem mặt sau</span>
                    </div>
                  </div>

                  {/* BACK SIDE */}
                  <div className="absolute w-full h-full backface-hidden bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-900 border-2 border-purple-500/60 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col justify-between p-4 sm:p-7 rotate-y-180 overflow-hidden">
                    {/* Top Tag */}
                    <div className="flex items-center justify-between border-b border-purple-500/20 pb-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full text-xs font-bold uppercase tracking-wider">
                        ✨ Mặt sau
                      </span>
                      <span className="text-xs font-mono text-purple-300/60 font-semibold">
                        #{activeIndex + 1}
                      </span>
                    </div>

                    {/* Card Back Content */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-3 px-2 overflow-y-auto custom-scrollbar w-full">
                      {(activeCard.backImage || activeCard.image) && (
                        <div className="max-h-24 sm:max-h-32 mb-3 shrink-0 rounded-xl overflow-hidden border border-purple-900/40 shadow-md bg-indigo-950/40 p-1 flex items-center justify-center">
                          <img 
                            src={activeCard.backImage || activeCard.image} 
                            alt="Back Illustration" 
                            referrerPolicy="no-referrer"
                            className="max-h-[96px] sm:max-h-[128px] max-w-full object-contain rounded-lg"
                          />
                        </div>
                      )}
                      <div className="text-lg sm:text-2xl font-bold text-amber-200 leading-relaxed drop-shadow-sm">
                        <MarkdownMath 
                          content={activeCard.back || '(Chưa nhập nội dung mặt sau)'} 
                          className="text-amber-200 text-center font-bold"
                        />
                      </div>
                    </div>

                    {/* Bottom Hint */}
                    <div className="pt-2.5 border-t border-purple-500/20 text-center flex items-center justify-center gap-2 text-xs font-semibold text-purple-300/80">
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Nhấp để quay lại mặt trước</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          )}

          {/* Fixed Bottom Footer: Controls Bar & Pagination */}
          <div className="shrink-0 bg-slate-950 border-t border-slate-800 px-3 sm:px-6 py-3 space-y-2.5">
            {/* Controls Bar */}
            <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-2xl mx-auto">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-3 sm:px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl font-bold text-xs sm:text-sm border border-slate-700 flex items-center gap-1 sm:gap-2 transition-all shadow shrink-0 active:scale-95 min-h-[42px]"
              >
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span className="hidden xs:inline">Thẻ trước</span>
                <span className="xs:hidden">Trước</span>
              </button>

              <button
                onClick={handleToggleFlip}
                className="flex-1 max-w-[220px] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-600/30 border border-indigo-400/30 flex items-center justify-center gap-2 active:scale-95 transition-all min-h-[42px]"
              >
                <RotateCw className={`w-4 h-4 transition-transform duration-300 shrink-0 ${isFlipped ? 'rotate-180' : ''}`} />
                <span>{isFlipped ? 'Mặt Trước' : 'Lật Thẻ'}</span>
              </button>

              <button
                onClick={handleNext}
                disabled={currentIndex === displayCards.length - 1}
                className="px-3 sm:px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl font-bold text-xs sm:text-sm border border-slate-700 flex items-center gap-1 sm:gap-2 transition-all shadow shrink-0 active:scale-95 min-h-[42px]"
              >
                <span className="hidden xs:inline">Thẻ tiếp</span>
                <span className="xs:hidden">Tiếp</span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </div>

            {/* Responsive Pagination Indicators */}
            {displayCards.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 overflow-x-auto custom-scrollbar max-w-full py-1 px-2">
                {displayCards.map((card, idx) => (
                  <button
                    key={card.id || idx}
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentIndex(idx);
                    }}
                    className="p-1 rounded-full focus:outline-none transition-transform hover:scale-125"
                    title={`Đến thẻ ${idx + 1}`}
                  >
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        currentIndex === idx 
                          ? 'w-7 bg-indigo-500 shadow-sm shadow-indigo-500/80 ring-2 ring-indigo-400/50' 
                          : 'w-2.5 bg-slate-700 hover:bg-slate-500'
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
