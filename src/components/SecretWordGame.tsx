import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trophy, RotateCw, CheckCircle2, Search, Sparkles, Star, Award, KeyRound } from 'lucide-react';
import { MarkdownMath } from './MarkdownMath';
import { ParsedQuestionItem, cleanQuestionText } from '../views/AssignmentsView';

export interface SecretWordGameProps {
  questions: ParsedQuestionItem[];
  onClose: () => void;
  isStudentMode?: boolean;
  onSubmitWork?: (score: number, correctAnswers: number, answersMap: Record<string, number>) => void;
}

export interface WordItem {
  id: string;
  raw: string;     // Normalized uppercase without diacritics/spaces (e.g. TOANHOC)
  display: string; // Original display text with diacritics (e.g. TOÁN HỌC)
  found?: boolean;
  color?: string;
}

export interface PathCell {
  r: number;
  c: number;
  char: string;
  color?: string;
}

// Fallback Word Database if no valid questions provided
const DEFAULT_WORD_DATABASE: { raw: string; display: string }[] = [
  { raw: "TOANHOC", display: "TOÁN HỌC" },
  { raw: "SINHHOC", display: "SINH HỌC" },
  { raw: "VATLY", display: "VẬT LÝ" },
  { raw: "HOAHOC", display: "HÓA HỌC" },
  { raw: "VUTRU", display: "VŨ TRỤ" },
  { raw: "HANHTINH", display: "HÀNH TINH" },
  { raw: "KHAMPHA", display: "KHÁM PHÁ" },
  { raw: "TINHBAN", display: "TÌNH BẠN" }
];

const HIGHLIGHT_COLORS = [
  '#ef4444', // Red 500
  '#f97316', // Orange 500
  '#eab308', // Yellow 500
  '#22c55e', // Green 500
  '#06b6d4', // Cyan 500
  '#3b82f6', // Blue 500
  '#8b5cf6', // Violet 500
  '#d946ef'  // Fuchsia 500
];

// Normalize Vietnamese string to raw uppercase letters without accents or spaces
export function normalizeVietnameseWord(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/đ/g, 'd')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

export function SecretWordGame({
  questions,
  onClose,
  isStudentMode = false,
  onSubmitWork
}: SecretWordGameProps) {
  // Extract topic & candidate words from input questions
  const { parsedTopic, parsedWords } = useMemo(() => {
    let topic = "Khám Phá Bài Học";
    const wordList: WordItem[] = [];
    const usedRaws = new Set<string>();

    if (questions && questions.length > 0) {
      questions.forEach((q, qIdx) => {
        // Look for topic in question text e.g. "Chủ đề: Khám Phá Khoa Học"
        const topicMatch = q.question.match(/(?:Chủ đề|Chủ đề:|Topic:)\s*([^\n]+)/i);
        if (topicMatch) {
          topic = topicMatch[1].trim();
        } else if (q.groupTitle) {
          topic = q.groupTitle;
        }

        // Look for candidate target words in correctAnswer or options
        let candidateStrings: string[] = [];

        if (typeof q.correctAnswer === 'string' && q.correctAnswer.trim().length > 0) {
          candidateStrings = q.correctAnswer.split(/[|,\n]+/).map(s => s.trim());
        } else if (q.options && q.options.length > 0) {
          candidateStrings = q.options.flatMap(opt => opt.split(/[|,\n]+/)).map(s => s.trim());
        } else if (q.question) {
          const rawQ = cleanQuestionText(q.question);
          candidateStrings = rawQ.split(/[|,\n]+/).map(s => s.trim());
        }

        candidateStrings.forEach(str => {
          const raw = normalizeVietnameseWord(str);
          if (raw.length >= 2 && raw.length <= 12 && !usedRaws.has(raw)) {
            usedRaws.add(raw);
            wordList.push({
              id: `word_${qIdx}_${wordList.length}_${raw}`,
              raw,
              display: str.toUpperCase(),
              found: false
            });
          }
        });
      });
    }

    // Fallback if no valid words extracted
    if (wordList.length < 3) {
      DEFAULT_WORD_DATABASE.forEach((item, idx) => {
        if (!usedRaws.has(item.raw)) {
          wordList.push({
            id: `default_${idx}_${item.raw}`,
            raw: item.raw,
            display: item.display,
            found: false
          });
        }
      });
    }

    return {
      parsedTopic: topic,
      parsedWords: wordList.slice(0, 8) // Limit to 8 words max for clean board
    };
  }, [questions]);

  // Determine grid size based on longest word length
  const gridSize = useMemo(() => {
    const maxLen = parsedWords.reduce((max, w) => Math.max(max, w.raw.length), 0);
    return Math.max(10, Math.min(12, maxLen + 2));
  }, [parsedWords]);

  // State
  const [gridData, setGridData] = useState<string[][]>([]);
  const [targetWords, setTargetWords] = useState<WordItem[]>([]);
  const [foundCellMap, setFoundCellMap] = useState<Record<string, string>>({}); // "r_c" => color
  const [foundWordsCount, setFoundWordsCount] = useState(0);
  const [score, setScore] = useState(0);
  const [isWinModalOpen, setIsWinModalOpen] = useState(false);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [startCell, setStartCell] = useState<{ r: number; c: number } | null>(null);
  const [selectingPath, setSelectingPath] = useState<PathCell[]>([]);

  const gridRef = useRef<HTMLDivElement>(null);

  // Initialize Game Grid
  const initGame = () => {
    // Select words to place
    const activeWords = [...parsedWords].map(w => ({ ...w, found: false }));
    const newGrid: string[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));

    // Directions: [dRow, dCol] (Right, Down, Diagonal Down-Right, Diagonal Up-Right)
    const dirs = [[0, 1], [1, 0], [1, 1], [-1, 1]];

    activeWords.forEach(wordObj => {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 300) {
        attempts++;
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        const startR = Math.floor(Math.random() * gridSize);
        const startC = Math.floor(Math.random() * gridSize);

        // 50% chance to reverse word in grid
        const wordStr = Math.random() > 0.5 ? wordObj.raw : wordObj.raw.split('').reverse().join('');

        const [dr, dc] = dir;
        const endR = startR + dr * (wordStr.length - 1);
        const endC = startC + dc * (wordStr.length - 1);

        // Check bounds
        if (endR >= 0 && endR < gridSize && endC >= 0 && endC < gridSize) {
          // Check collision
          let canPlace = true;
          for (let i = 0; i < wordStr.length; i++) {
            const currR = startR + dr * i;
            const currC = startC + dc * i;
            const existing = newGrid[currR][currC];
            if (existing !== '' && existing !== wordStr[i]) {
              canPlace = false;
              break;
            }
          }

          if (canPlace) {
            for (let i = 0; i < wordStr.length; i++) {
              newGrid[startR + dr * i][startC + dc * i] = wordStr[i];
            }
            placed = true;
          }
        }
      }
    });

    // Fill empty cells with random alphabet
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVXY";
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (newGrid[r][c] === '') {
          newGrid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
      }
    }

    setGridData(newGrid);
    setTargetWords(activeWords);
    setFoundCellMap({});
    setFoundWordsCount(0);
    setScore(0);
    setIsWinModalOpen(false);
  };

  useEffect(() => {
    initGame();
  }, [parsedWords, gridSize]);

  // Pointer position helper
  const getCellFromEvent = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): { r: number; c: number } | null => {
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return null;
    }

    const element = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (element && element.dataset && element.dataset.r !== undefined && element.dataset.c !== undefined) {
      return {
        r: parseInt(element.dataset.r, 10),
        c: parseInt(element.dataset.c, 10)
      };
    }
    return null;
  };

  // Handle Drag Start
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const cell = getCellFromEvent(e);
    if (!cell) return;

    if (e.cancelable && e.type === 'touchstart') {
      e.preventDefault();
    }

    setIsDragging(true);
    setStartCell(cell);
    updatePath(cell.r, cell.c, cell.r, cell.c);
  };

  // Handle Dragging
  const updatePath = (startR: number, startC: number, endR: number, endC: number) => {
    const dr = endR - startR;
    const dc = endC - startC;

    const isHorizontal = dr === 0;
    const isVertical = dc === 0;
    const isDiagonal = Math.abs(dr) === Math.abs(dc);

    const path: PathCell[] = [];

    if (!isHorizontal && !isVertical && !isDiagonal) {
      // Just single start cell if not a straight line
      if (gridData[startR] && gridData[startR][startC]) {
        path.push({ r: startR, c: startC, char: gridData[startR][startC] });
      }
    } else {
      const steps = Math.max(Math.abs(dr), Math.abs(dc));
      const stepR = dr === 0 ? 0 : dr / steps;
      const stepC = dc === 0 ? 0 : dc / steps;

      for (let i = 0; i <= steps; i++) {
        const r = startR + stepR * i;
        const c = startC + stepC * i;
        if (gridData[r] && gridData[r][c] !== undefined) {
          path.push({ r, c, char: gridData[r][c] });
        }
      }
    }

    setSelectingPath(path);
  };

  // Global Pointer Listeners during drag
  useEffect(() => {
    if (!isDragging || !startCell) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const cell = getCellFromEvent(e);
      if (cell) {
        updatePath(startCell.r, startCell.c, cell.r, cell.c);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      checkSelectedWord();
      setStartCell(null);
      setSelectingPath([]);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, startCell, selectingPath, targetWords, gridData]);

  // Check if current drag path matches any word
  const checkSelectedWord = () => {
    if (selectingPath.length < 2) return;

    const wordForwards = selectingPath.map(p => p.char).join('');
    const wordBackwards = selectingPath.map(p => p.char).reverse().join('');

    const matchedIdx = targetWords.findIndex(w =>
      !w.found && (w.raw === wordForwards || w.raw === wordBackwards)
    );

    if (matchedIdx !== -1) {
      const matchedWord = targetWords[matchedIdx];
      const assignedColor = HIGHLIGHT_COLORS[matchedIdx % HIGHLIGHT_COLORS.length];

      // Update target words
      const updatedWords = [...targetWords];
      updatedWords[matchedIdx] = { ...matchedWord, found: true, color: assignedColor };
      setTargetWords(updatedWords);

      // Save found cells map
      const newFoundCellMap = { ...foundCellMap };
      selectingPath.forEach(p => {
        newFoundCellMap[`${p.r}_${p.c}`] = assignedColor;
      });
      setFoundCellMap(newFoundCellMap);

      const nextFoundCount = foundWordsCount + 1;
      const nextScore = score + 10;
      setFoundWordsCount(nextFoundCount);
      setScore(nextScore);

      // Check All Words Found Win
      if (nextFoundCount === targetWords.length) {
        setTimeout(() => {
          setIsWinModalOpen(true);
        }, 400);
      }
    }
  };

  const isCellSelected = (r: number, c: number) => {
    return selectingPath.some(p => p.r === r && p.c === c);
  };

  const handleFinish = () => {
    if (onSubmitWork) {
      const answersMap: Record<string, number> = {};
      questions.forEach((q, idx) => {
        answersMap[q.id || `q_${idx}`] = 1;
      });
      onSubmitWork(score, foundWordsCount, answersMap);
    }
    onClose();
  };

  return (
    <div
      className="w-full h-full flex-1 min-h-0 text-slate-800 select-none overflow-hidden relative rounded-2xl border border-slate-200/80 shadow-xl flex flex-col custom-game-container bg-slate-50"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 20%, #f1f5f9 0%, #f8fafc 60%, #e2e8f0 100%)'
      }}
      id="game-container"
    >
      {/* Dynamic Style Animations */}
      <style>{`
        .grid-cell-found {
          animation: popCell 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes popCell {
          0% { transform: scale(1); }
          50% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* TOP HEADER BAR */}
      <div className="p-3 sm:p-4 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between gap-2 sm:gap-4 shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
            <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg md:text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <span>Ô Chữ Khóa Bí Mật</span>
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold truncate max-w-[180px] xs:max-w-xs sm:max-w-md">
              Chủ đề: <span className="text-emerald-700 font-bold">{parsedTopic}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Score counter badge */}
          <div className="bg-amber-50 border border-amber-200/80 px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
            <span className="font-black text-amber-600 text-xs sm:text-base">{score}</span>
            <span className="text-[10px] text-amber-700/70 uppercase font-black hidden sm:inline">Điểm</span>
          </div>

          {/* New Board Button */}
          {!isStudentMode && (
            <button
              type="button"
              onClick={initGame}
              className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs shrink-0"
            >
              <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span className="hidden sm:inline">Tạo bảng mới</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN GAME CONTENT AREA */}
      <div className="flex-1 min-h-0 p-2 sm:p-4 md:p-6 flex flex-col md:flex-row items-center justify-center gap-3 sm:gap-6 overflow-y-auto custom-scrollbar z-10">

        {/* LEFT / TOP: GRID BOARD (100% Adaptive to any screen width) */}
        <div className="shrink-0 flex items-center justify-center w-full max-w-[min(94vw,480px)] md:max-w-[480px]">
          <div
            ref={gridRef}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            className="grid gap-1 sm:gap-1.5 bg-white border-2 border-slate-200/90 p-1.5 sm:p-3 rounded-2xl shadow-lg shadow-slate-200/50 touch-none select-none w-full aspect-square"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`
            }}
          >
            {gridData.map((row, r) =>
              row.map((char, c) => {
                const cellKey = `${r}_${c}`;
                const foundColor = foundCellMap[cellKey];
                const selected = isCellSelected(r, c);

                return (
                  <div
                    key={cellKey}
                    data-r={r}
                    data-c={c}
                    style={{
                      backgroundColor: foundColor ? foundColor : selected ? '#0d9488' : undefined,
                      borderColor: foundColor ? foundColor : selected ? '#14b8a6' : undefined
                    }}
                    className={`aspect-square w-full rounded-md sm:rounded-xl font-black text-[clamp(10px,2.8vw,18px)] flex items-center justify-center cursor-pointer transition-all duration-150 select-none ${
                      foundColor
                        ? 'text-white grid-cell-found shadow-xs'
                        : selected
                          ? 'text-white scale-105 z-10 shadow-md shadow-teal-500/40'
                          : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200/80 shadow-2xs'
                    }`}
                  >
                    {char}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT / BOTTOM: WORDS TO FIND LIST */}
        <div className="w-full max-w-[min(94vw,480px)] md:w-72 bg-white/95 border border-slate-200/90 p-3 sm:p-4 rounded-2xl shadow-lg shadow-slate-100 flex flex-col shrink-0 max-h-[160px] xs:max-h-[200px] md:max-h-none overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
            <h2 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <Search className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Từ Cần Tìm</span>
            </h2>
            <span className="text-xs font-black bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
              {foundWordsCount}/{targetWords.length}
            </span>
          </div>

          <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-1 gap-1.5 sm:gap-2">
            {targetWords.map(word => (
              <div
                key={word.id}
                style={{
                  borderColor: word.found && word.color ? word.color : undefined,
                  backgroundColor: word.found && word.color ? `${word.color}15` : undefined,
                  color: word.found && word.color ? word.color : undefined
                }}
                className={`px-2 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-extrabold border transition-all duration-300 flex items-center justify-between gap-1 ${
                  word.found
                    ? 'line-through opacity-85 shadow-2xs'
                    : 'bg-slate-50 border-slate-200/90 text-slate-700 shadow-2xs hover:border-emerald-300'
                }`}
              >
                <span className="truncate">{word.display}</span>
                {word.found && <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* WIN MODAL OVERLAY */}
      {isWinModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-emerald-300 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-5 animate-pop">
            <div className="w-20 h-20 bg-gradient-to-tr from-emerald-100 to-teal-50 text-emerald-600 border-2 border-emerald-200 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-sm">
              🏆
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                Giải Mã Thành Công!
              </h2>
              <p className="text-slate-600 font-semibold text-xs sm:text-sm mt-1">
                Bạn đã xuất sắc tìm thấy toàn bộ từ khóa bí mật của bài học!
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-around shadow-inner">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Điểm</span>
                <div className="text-2xl font-black text-amber-500">{score} Điểm</div>
              </div>
              <div className="h-8 w-[1px] bg-slate-200" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Từ Khóa</span>
                <div className="text-2xl font-black text-emerald-600">{foundWordsCount}/{targetWords.length}</div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {!isStudentMode && (
                <button
                  type="button"
                  onClick={initGame}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-extrabold text-xs sm:text-sm rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-4 h-4 text-slate-600" /> Chơi Ván Mới
                </button>
              )}
              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
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
