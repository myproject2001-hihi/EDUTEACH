import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, RotateCw, Eye, Shuffle, Sparkles, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter out completely empty flashcards for preview, or use all
  const validCards = flashcards.filter(c => c.front.trim() || c.back.trim() || c.frontImage || c.backImage || c.image);
  const displayCards = validCards.length > 0 ? validCards : flashcards;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<number[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      if (containerRef.current && containerRef.current.requestFullscreen) {
        try {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        } catch (err) {
          console.warn("Fullscreen error:", err);
          setIsFullscreen(true);
        }
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        try {
          await document.exitFullscreen();
          setIsFullscreen(false);
        } catch (err) {
          console.warn("Fullscreen exit error:", err);
          setIsFullscreen(false);
        }
      } else {
        setIsFullscreen(false);
      }
    }
  };

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
    <div 
      ref={containerRef}
      className={`fixed inset-0 z-[10000] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center ${
        isFullscreen ? 'p-0 w-screen h-screen' : 'p-1 sm:p-4 md:p-6'
      }`}
    >
      <div className={`bg-slate-900 text-slate-100 w-full max-w-5xl h-full flex flex-col relative border border-slate-700 overflow-hidden ${
        isFullscreen ? 'max-h-full rounded-none border-0' : 'max-h-[98vh] sm:max-h-[92vh] rounded-xl sm:rounded-3xl shadow-2xl'
      }`}>
        
        {/* Top Header */}
        <div className="h-11 sm:h-14 bg-slate-950 flex items-center justify-between px-3 sm:px-6 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="hidden xs:flex gap-1.5 shrink-0">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Eye className="w-4 h-4 text-indigo-400 shrink-0" />
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-200 uppercase tracking-wider truncate">
                {title}
              </h3>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] sm:text-[11px] font-bold rounded-full border border-indigo-500/30 shrink-0">
                {displayCards.length} thẻ
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`p-1.5 sm:px-3 rounded-xl transition-all duration-200 group flex items-center gap-1.5 shrink-0 border ${
                isFullscreen
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-400/40'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500/50 shadow-sm'
              }`}
              title={isFullscreen ? "Thu nhỏ (Esc)" : "Phóng to toàn màn hình"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider hidden sm:inline text-amber-200">Thu nhỏ</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-white">Phóng to</span>
                </>
              )}
            </button>
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
          <div className="px-3 sm:px-6 py-2 flex items-center justify-between gap-2 shrink-0 border-b border-slate-800/60 bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">
                Thẻ {currentIndex + 1} / {displayCards.length || 1}
              </span>
              <button
                onClick={handleToggleShuffle}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[11px] sm:text-xs font-bold border transition-all flex items-center gap-1 sm:gap-1.5 ${
                  isShuffled 
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/20' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                }`}
                title="Xáo trộn thứ tự thẻ"
              >
                <Shuffle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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

            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
              {isFlipped ? '🔄 Đang xem mặt sau' : '👆 Nhấn thẻ để lật'}
            </span>
          </div>

          {/* Empty State vs Interactive Card */}
          {displayCards.length === 0 || (!activeCard.front.trim() && !activeCard.back.trim() && !activeCard.frontImage && !activeCard.backImage && !activeCard.image) ? (
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
            <div className="flex-1 min-h-0 p-1.5 sm:p-4 md:p-6 flex items-center justify-center overflow-hidden w-full h-full">
              <motion.div 
                onClick={handleToggleFlip}
                className="w-full max-w-3xl h-full max-h-[580px] perspective-1000 cursor-pointer group relative my-auto flex-1 flex flex-col justify-center"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
              >
                <motion.div 
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                  className="relative w-full h-full transform-style-3d"
                >
                  {/* FRONT SIDE */}
                  <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-indigo-500/40 group-hover:border-indigo-500 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col p-2 sm:p-4 transition-colors overflow-hidden">
                    {/* Floating Top Tag (does not take flex height) */}
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-950/80 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow backdrop-blur-sm">
                        <Sparkles className="w-3 h-3 text-indigo-400" /> Mặt trước #{activeIndex + 1}
                      </span>
                    </div>

                    {/* Card Front Content - Maximize Space */}
                    <div className="flex-1 min-h-0 w-full h-full flex flex-col items-center justify-center text-center p-1 sm:p-2 overflow-hidden gap-2">
                      {(activeCard.frontImage || activeCard.image) && (
                        <div className="flex-1 min-h-0 w-full h-full rounded-xl overflow-hidden shadow-sm bg-slate-950/40 p-1 flex items-center justify-center">
                          <img 
                            src={activeCard.frontImage || activeCard.image} 
                            alt="Front Illustration" 
                            referrerPolicy="no-referrer"
                            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                            style={{ imageRendering: '-webkit-optimize-contrast' as any }}
                          />
                        </div>
                      )}
                      {activeCard.front && activeCard.front.trim().length > 0 && (
                        <div className="shrink-0 text-base sm:text-2xl md:text-3xl font-extrabold text-white leading-relaxed drop-shadow-sm px-2">
                          <MarkdownMath 
                            content={activeCard.front} 
                            className="text-white text-center font-extrabold"
                          />
                        </div>
                      )}
                      {!activeCard.front?.trim() && !(activeCard.frontImage || activeCard.image) && (
                        <div className="shrink-0 text-base sm:text-2xl font-extrabold text-white leading-relaxed drop-shadow-sm opacity-50">
                          (Chưa nhập nội dung mặt trước)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BACK SIDE */}
                  <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-900 border-2 border-purple-500/60 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col p-2 sm:p-4 rotate-y-180 overflow-hidden">
                    {/* Floating Top Tag (does not take flex height) */}
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-950/80 text-purple-300 border border-purple-500/40 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow backdrop-blur-sm">
                        ✨ Mặt sau #{activeIndex + 1}
                      </span>
                    </div>

                    {/* Card Back Content - Maximize Space */}
                    <div className="flex-1 min-h-0 w-full h-full flex flex-col items-center justify-center text-center p-1 sm:p-2 overflow-hidden gap-2">
                      {(activeCard.backImage || activeCard.image) && (
                        <div className="flex-1 min-h-0 w-full h-full rounded-xl overflow-hidden shadow-sm bg-indigo-950/40 p-1 flex items-center justify-center">
                          <img 
                            src={activeCard.backImage || activeCard.image} 
                            alt="Back Illustration" 
                            referrerPolicy="no-referrer"
                            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                            style={{ imageRendering: '-webkit-optimize-contrast' as any }}
                          />
                        </div>
                      )}
                      {activeCard.back && activeCard.back.trim().length > 0 && (
                        <div className="shrink-0 text-base sm:text-xl md:text-2xl font-bold text-amber-200 leading-relaxed drop-shadow-sm px-2">
                          <MarkdownMath 
                            content={activeCard.back} 
                            className="text-amber-200 text-center font-bold"
                          />
                        </div>
                      )}
                      {!activeCard.back?.trim() && !(activeCard.backImage || activeCard.image) && (
                        <div className="shrink-0 text-base sm:text-xl font-bold text-amber-200 leading-relaxed drop-shadow-sm opacity-50">
                          (Chưa nhập nội dung mặt sau)
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          )}

          {/* Fixed Bottom Footer: Controls Bar & Pagination */}
          <div className="shrink-0 bg-slate-950 border-t border-slate-800 px-3 sm:px-6 py-2 sm:py-3 space-y-2">
            {/* Controls Bar */}
            <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-2xl mx-auto">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm border border-slate-700 flex items-center gap-1 sm:gap-2 transition-all shadow shrink-0 active:scale-95 min-h-[40px] sm:min-h-[42px]"
              >
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span className="hidden xs:inline">Thẻ trước</span>
                <span className="xs:hidden">Trước</span>
              </button>

              <button
                onClick={handleToggleFlip}
                className="flex-1 max-w-[220px] py-2 sm:py-2.5 px-3 sm:px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-lg shadow-indigo-600/30 border border-indigo-400/30 flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 transition-all min-h-[40px] sm:min-h-[42px]"
              >
                <RotateCw className={`w-4 h-4 transition-transform duration-300 shrink-0 ${isFlipped ? 'rotate-180' : ''}`} />
                <span>{isFlipped ? 'Mặt Trước' : 'Lật Thẻ'}</span>
              </button>

              <button
                onClick={handleNext}
                disabled={currentIndex === displayCards.length - 1}
                className="px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm border border-slate-700 flex items-center gap-1 sm:gap-2 transition-all shadow shrink-0 active:scale-95 min-h-[40px] sm:min-h-[42px]"
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
