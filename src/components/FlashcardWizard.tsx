import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, Play, X, HelpCircle, Download, Upload, Plus, Trash2, Image, Link, 
  FolderOpen, Sparkles, AlertCircle, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ArrowUpDown, Check, HelpCircle as QuestionIcon, Layers, Search, ListOrdered, RotateCcw
} from 'lucide-react';
import { SAMPLE_TEMPLATES } from '../views/AssignmentsView';
import { SubFlashcardSet, Assignment } from '../types';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  image?: string;
  frontImage?: string;
  backImage?: string;
}

interface FlashcardWizardProps {
  flashcardSubStep: 1 | 2;
  setFlashcardSubStep: (step: 1 | 2) => void;
  newFlashcards: Flashcard[];
  setNewFlashcards: (cards: Flashcard[]) => void;
  newSubFlashcardSets?: SubFlashcardSet[];
  setNewSubFlashcardSets?: (sets: SubFlashcardSet[]) => void;
  rawQuestionCode: string;
  setRawQuestionCode: (code: string) => void;
  setShowFlashcardPreview: (show: boolean) => void;
  setShowFlashcardQuizTest: (show: boolean) => void;
  handleDownloadSampleFlashcards: () => void;
  handleImportFlashcards: (e: React.ChangeEvent<HTMLInputElement>) => void;
  allAssignments?: Assignment[];
}

export const FlashcardWizard: React.FC<FlashcardWizardProps> = ({
  flashcardSubStep,
  setFlashcardSubStep,
  newFlashcards,
  setNewFlashcards,
  newSubFlashcardSets,
  setNewSubFlashcardSets,
  rawQuestionCode,
  setRawQuestionCode,
  setShowFlashcardPreview,
  setShowFlashcardQuizTest,
  handleDownloadSampleFlashcards,
  handleImportFlashcards,
  allAssignments,
}) => {
  // Smart Batch Image Importer Modal States
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [frontFiles, setFrontFiles] = useState<{ name: string; base64: string; key: string }[]>([]);
  const [backFiles, setBackFiles] = useState<{ name: string; base64: string; key: string }[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [isDraggingFront, setIsDraggingFront] = useState(false);
  const [isDraggingBack, setIsDraggingBack] = useState(false);

  // Modal selector for adding existing flashcards or new sub-sets
  const [showSelectSubSetModal, setShowSelectSubSetModal] = useState(false);
  const [subsetSearchQuery, setSubsetSearchQuery] = useState('');

  // Reordering Modal state for sub-sets
  const [showReorderModal, setShowReorderModal] = useState(false);

  // Active Sub-Set state when editing a parent / combined lesson
  const [activeSubIndex, setActiveSubIndex] = useState<number>(0);

  const hasSubSets = Boolean(newSubFlashcardSets && newSubFlashcardSets.length > 0);
  const safeSubIndex = hasSubSets ? Math.min(activeSubIndex, (newSubFlashcardSets?.length || 1) - 1) : 0;
  const currentSubSet = hasSubSets && newSubFlashcardSets ? newSubFlashcardSets[safeSubIndex] : null;

  const moveSubSet = (fromIdx: number, toIdx: number) => {
    if (!setNewSubFlashcardSets || !newSubFlashcardSets) return;
    if (toIdx < 0 || toIdx >= newSubFlashcardSets.length || fromIdx === toIdx) return;
    const updated = [...newSubFlashcardSets];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setNewSubFlashcardSets(updated);
    setActiveSubIndex(toIdx);
    setNewFlashcards(moved.flashcards && moved.flashcards.length > 0 ? moved.flashcards : [{ id: Date.now().toString(), front: '', back: '' }]);
  };

  const reverseAllSubSets = () => {
    if (!setNewSubFlashcardSets || !newSubFlashcardSets || newSubFlashcardSets.length <= 1) return;
    const reversed = [...newSubFlashcardSets].reverse();
    const newActive = Math.max(0, newSubFlashcardSets.length - 1 - safeSubIndex);
    setNewSubFlashcardSets(reversed);
    setActiveSubIndex(newActive);
    setNewFlashcards(reversed[newActive]?.flashcards || [{ id: Date.now().toString(), front: '', back: '' }]);
  };

  const updateActiveCards = (updatedCards: Flashcard[]) => {
    setNewFlashcards(updatedCards);
    if (hasSubSets && setNewSubFlashcardSets && newSubFlashcardSets) {
      const updated = [...newSubFlashcardSets];
      if (updated[safeSubIndex]) {
        updated[safeSubIndex] = {
          ...updated[safeSubIndex],
          flashcards: updatedCards
        };
        setNewSubFlashcardSets(updated);
      }
    }
  };

  // Available Flashcard Assignments for Modal
  const availableAssignmentsForModal = (allAssignments || []).filter(a => {
    const isFlashcard = a.type === 'flashcard' || (a.flashcards && a.flashcards.length > 0) || (a.subFlashcardSets && a.subFlashcardSets.length > 0);
    const notAlreadyInSubSets = !newSubFlashcardSets?.some(sub => sub.id === a.id || sub.title.trim().toLowerCase() === a.title.trim().toLowerCase());
    const matchesSearch = !subsetSearchQuery.trim() || 
      a.title.toLowerCase().includes(subsetSearchQuery.toLowerCase()) || 
      (a.description && a.description.toLowerCase().includes(subsetSearchQuery.toLowerCase()));
    return isFlashcard && notAlreadyInSubSets && matchesSearch;
  });

  const processFiles = async (files: FileList | File[], setFilesState: React.Dispatch<React.SetStateAction<{ name: string; base64: string; key: string }[]>>) => {
    if (!files || files.length === 0) return;
    
    setIsReadingFiles(true);
    const loaded: { name: string; base64: string; key: string }[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const base64 = await compressImage(file);
      loaded.push({
        name: file.name,
        base64,
        key: extractKey(file.name)
      });
    }
    
    setFilesState(loaded);
    setIsReadingFiles(false);
  };

  // Match Helper Function to extract standard numbers or normalized strings
  const extractKey = (filename: string): string => {
    // Remove extension
    const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
    // Match first sequence of digits
    const match = baseName.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10).toString(); // "01" -> "1"
    }
    // Fallback: lowercase alphanumeric name
    return baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  // Handle uploading multiple files for Front
  const handleFrontFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files, setFrontFiles);
    }
  };

  const handleFrontDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingFront(false);
    if (e.dataTransfer.files) {
      await processFiles(e.dataTransfer.files, setFrontFiles);
    }
  };

  const handleFrontDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingFront(true);
  };

  const handleFrontDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingFront(false);
  };

  // Handle uploading multiple files for Back
  const handleBackFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files, setBackFiles);
    }
  };

  const handleBackDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingBack(false);
    if (e.dataTransfer.files) {
      await processFiles(e.dataTransfer.files, setBackFiles);
    }
  };

  const handleBackDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingBack(true);
  };

  const handleBackDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingBack(false);
  };

  // Compress and read image as Base64 to ensure size is lightweight for Firestore (< 40KB per image) while keeping sharp text
  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.70): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions to maintain aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Convert to JPEG to minimize size
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = () => {
          resolve(event.target?.result as string);
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(file);
    });
  };

  // Compute paired items preview with intelligent multi-level matching and fallback alignment
  const pairedItems = React.useMemo(() => {
    if (frontFiles.length === 0 && backFiles.length === 0) return [];

    // Helper to normalize name for comparison:
    // lowercase, removes common extensions, and removes indicators like front, back, truoc, sau, t, s, ans, answer, question
    const cleanFilename = (name: string): string => {
      const base = name.substring(0, name.lastIndexOf('.')) || name;
      return base
        .toLowerCase()
        .replace(/(_|-|\s)+(front|back|truoc|sau|t|s|ans|answer|question|debai|dapan|image|img|pic|mat_truoc|mat_sau|mattruoc|matsau)/gi, '')
        .replace(/[^a-z0-9]/g, '');
    };

    // Helper to get the last sequence of numbers (e.g. "image_10_1" -> "1", "toan10_bai2" -> "2")
    const getLastNumber = (name: string): string | null => {
      const base = name.substring(0, name.lastIndexOf('.')) || name;
      const matches = base.match(/\d+/g);
      if (matches && matches.length > 0) {
        // Return the last number sequence
        return parseInt(matches[matches.length - 1], 10).toString();
      }
      return null;
    };

    // Create copies of the file lists so we can track which ones are already matched
    let unmatchedFront = [...frontFiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    let unmatchedBack = [...backFiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const matchedPairs: {
      key: string;
      front?: typeof frontFiles[0];
      back?: typeof backFiles[0];
      status: 'matched' | 'only_front' | 'only_back';
    }[] = [];

    // --- LEVEL 1: EXACT NORMALIZED NAME MATCH ---
    // (e.g. "apple_front.png" and "apple_back.png" both normalize to "apple")
    for (let i = unmatchedFront.length - 1; i >= 0; i--) {
      const f = unmatchedFront[i];
      const fNorm = cleanFilename(f.name);
      if (!fNorm) continue;
      
      // Look for a back file that has the exact same normalized name
      const bIdx = unmatchedBack.findIndex(b => cleanFilename(b.name) === fNorm);
      if (bIdx !== -1) {
        const b = unmatchedBack[bIdx];
        matchedPairs.push({
          key: fNorm,
          front: f,
          back: b,
          status: 'matched'
        });
        unmatchedFront.splice(i, 1);
        unmatchedBack.splice(bIdx, 1);
      }
    }

    // --- LEVEL 2: LAST NUMBER SEQUENCE MATCH ---
    // (e.g. "front_1.png" and "back_1.png" both have last number "1")
    for (let i = unmatchedFront.length - 1; i >= 0; i--) {
      const f = unmatchedFront[i];
      const fNum = getLastNumber(f.name);
      if (fNum !== null) {
        // Look for a back file with the same last number
        const bIdx = unmatchedBack.findIndex(b => getLastNumber(b.name) === fNum);
        if (bIdx !== -1) {
          const b = unmatchedBack[bIdx];
          matchedPairs.push({
            key: fNum,
            front: f,
            back: b,
            status: 'matched'
          });
          unmatchedFront.splice(i, 1);
          unmatchedBack.splice(bIdx, 1);
        }
      }
    }

    // --- LEVEL 3: FALLBACK INDEX-BASED MATCHING ---
    // If we still have unmatched front and back files, they might have arbitrary names (e.g. "a.jpg", "b.jpg", "c.jpg" vs "x.jpg", "y.jpg", "z.jpg")
    // Let's pair them up in their sorted order! This guarantees they match 1-to-1 without losing any files.
    const fallbackCount = Math.min(unmatchedFront.length, unmatchedBack.length);
    for (let i = 0; i < fallbackCount; i++) {
      const f = unmatchedFront[i];
      const b = unmatchedBack[i];
      matchedPairs.push({
        key: `ghep_${i + 1}`,
        front: f,
        back: b,
        status: 'matched'
      });
    }

    // Remove the paired files from Level 3
    unmatchedFront = unmatchedFront.slice(fallbackCount);
    unmatchedBack = unmatchedBack.slice(fallbackCount);

    // --- LEVEL 4: REMAINING UNPAIRED FILES ---
    unmatchedFront.forEach((f, idx) => {
      matchedPairs.push({
        key: `truoc_${idx + 1}`,
        front: f,
        status: 'only_front'
      });
    });

    unmatchedBack.forEach((b, idx) => {
      matchedPairs.push({
        key: `sau_${idx + 1}`,
        back: b,
        status: 'only_back'
      });
    });

    // Finally sort the matched pairs to ensure they appear in the correct 1, 2, 3 order
    matchedPairs.sort((a, b) => {
      const aName = a.front?.name || a.back?.name || a.key;
      const bName = b.front?.name || b.back?.name || b.key;
      return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' });
    });

    return matchedPairs;
  }, [frontFiles, backFiles]);

  // Execute import of matched cards
  const executeBatchImport = () => {
    if (pairedItems.length === 0) {
      alert('Chưa có file ảnh nào được chọn!');
      return;
    }

    const importedCards: Flashcard[] = pairedItems.map((item, idx) => {
      return {
        id: `fc_batch_${Date.now()}_${idx}`,
        front: '', // Leave text empty to focus on image
        back: '', // Leave text empty to focus on image
        frontImage: item.front?.base64,
        backImage: item.back?.base64
      };
    });

    updateActiveCards(importedCards);
    setShowBatchModal(false);
    setFrontFiles([]);
    setBackFiles([]);
  };

  return (
    <div id="flashcard-wizard-container" className="flex-1 flex flex-col md:overflow-hidden bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
      {/* Stepper Header (Only shown for SINGLE Flashcard sets, HIDDEN for Parent/Combined sets) */}
      {!hasSubSets && (
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-4 border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto custom-scrollbar flex-1 pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFlashcardSubStep(1)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 ${flashcardSubStep === 1 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-black">1</span>
              Thiết Lập Bộ Thẻ
            </button>
            <span className="text-slate-300 text-xs shrink-0">➔</span>
            <button
              type="button"
              onClick={() => setFlashcardSubStep(2)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 ${flashcardSubStep === 2 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-black">2</span>
              Câu Hỏi Trắc Nghiệm
            </button>
          </div>
        </div>
      )}

      {/* Step Contents */}
      <div className="flex-1 md:overflow-hidden min-h-0 flex flex-col">
        <AnimatePresence mode="wait">
          {(flashcardSubStep === 1 || hasSubSets) && (
            <motion.div 
              key="flashcard-step-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="flex-1 min-h-0 flex flex-col space-y-3"
            >
              {/* Single Flashcard Set Top Banner (Hidden when hasSubSets is true) */}
              {!hasSubSets && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2 shrink-0 bg-white p-3 rounded-2xl border shadow-sm">
                  <div>
                    <span className="text-[10px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Bước 1</span>
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-800 mt-1 flex items-center gap-2">
                      <span>🗂️</span> Tạo danh sách thẻ ghi nhớ ({newFlashcards.length} thẻ)
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {setNewSubFlashcardSets && (
                      <button
                        type="button"
                        onClick={() => {
                          const initialSub: SubFlashcardSet = {
                            id: `sub_${Date.now()}_1`,
                            title: 'Bộ con 1',
                            description: '',
                            flashcards: newFlashcards.length > 0 ? newFlashcards : [{ id: Date.now().toString(), front: '', back: '' }],
                            questions: []
                          };
                          setNewSubFlashcardSets([initialSub]);
                          setActiveSubIndex(0);
                          setShowSelectSubSetModal(true);
                        }}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0"
                        title="Chuyển sang chế độ bài học tổng hợp gồm nhiều bộ con"
                      >
                        <Layers className="w-3.5 h-3.5" /> Gộp thành Bài học tổng hợp
                      </button>
                    )}

                    <button 
                      type="button"
                      onClick={() => setShowFlashcardPreview(true)}
                      className="px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold rounded-xl text-xs sm:text-sm border border-indigo-500 flex items-center gap-1.5 transition-all shadow-md shadow-indigo-100 shrink-0"
                      title="Xem trước trải nghiệm học lật thẻ của học sinh"
                    >
                      <Play className="w-3.5 h-3.5" /> Preview bộ thẻ
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        if (window.confirm("⚠️ Bạn có chắc chắn muốn XÓA TẤT CẢ thẻ ghi nhớ hiện tại không? Tất cả ảnh và nội dung đã thiết lập sẽ bị mất.")) {
                          updateActiveCards([{ id: Date.now().toString(), front: '', back: '' }]);
                        }
                      }}
                      className="px-2.5 sm:px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 flex items-center gap-1.5 transition-colors shadow-sm active:scale-95 shrink-0"
                      title="Xóa nhanh toàn bộ danh sách thẻ"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả
                    </button>

                    {/* Smart Batch Upload Button */}
                    <button
                      type="button"
                      onClick={() => setShowBatchModal(true)}
                      className="px-3 sm:px-4 py-2 bg-purple-50 text-purple-700 font-extrabold rounded-xl text-xs border border-purple-200 hover:bg-purple-100 flex items-center gap-1.5 transition-colors shrink-0 shadow-sm active:scale-95"
                      title="Ghép hàng loạt ảnh mặt trước và mặt sau cực dễ"
                    >
                      <FolderOpen className="w-3.5 h-3.5" /> Ghép ảnh hàng loạt
                    </button>

                    <button 
                      type="button"
                      onClick={handleDownloadSampleFlashcards}
                      className="px-3 sm:px-4 py-2 bg-amber-50 text-amber-700 font-bold rounded-xl text-xs border border-amber-200 hover:bg-amber-100 flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" /> Tải file mẫu
                    </button>
                    <label className="px-3 sm:px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 hover:bg-slate-200 cursor-pointer flex items-center gap-1.5 transition-colors shrink-0">
                      <Upload className="w-3.5 h-3.5" /> Nhập file
                      <input type="file" accept=".txt,.csv,.json" hidden onChange={handleImportFlashcards} />
                    </label>
                    <button 
                      type="button" 
                      onClick={() => updateActiveCards([...newFlashcards, { id: Date.now().toString(), front: '', back: '' }])} 
                      className="px-3 sm:px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 flex items-center gap-1.5 transition-colors shadow-sm shrink-0 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm thẻ mới
                    </button>
                  </div>
                </div>
              )}

              {/* Hierarchical Sub-Sets Management Tabs & Active Sub-Set Config */}
              {hasSubSets && newSubFlashcardSets && (
                <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 rounded-2xl p-4 text-white space-y-3 shadow-md border border-indigo-500/30 shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-2 bg-indigo-500/30 rounded-xl text-indigo-200">📦</span>
                      <div>
                        <h5 className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-2">
                          <span>BÀI HỌC TỔNG HỢP (BỘ CHA)</span>
                          <span className="text-[10px] px-2.5 py-0.5 bg-indigo-500/40 rounded-md font-bold text-indigo-200 border border-indigo-400/30">
                            {newSubFlashcardSets.length} bộ con
                          </span>
                        </h5>
                        <p className="text-[11px] text-indigo-200/80 mt-0.5">
                          Nhấp chọn từng bộ con bên dưới để chỉnh sửa hoặc điều chỉnh thứ tự hiển thị.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {newSubFlashcardSets.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowReorderModal(true)}
                            className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold border border-white/20 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                            title="Mở bảng sắp xếp lại thứ tự các bộ con"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5 text-amber-300" /> Sắp xếp thứ tự ({newSubFlashcardSets.length})
                          </button>
                          <button
                            type="button"
                            onClick={reverseAllSubSets}
                            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white rounded-xl text-xs font-bold border border-white/15 transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                            title="Đảo ngược toàn bộ thứ tự các bộ con"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Đảo thứ tự
                          </button>
                        </>
                      )}

                      {setNewSubFlashcardSets && (
                        <button
                          type="button"
                          onClick={() => setShowSelectSubSetModal(true)}
                          className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 rounded-xl text-xs font-black border border-amber-300 transition-all active:scale-95 flex items-center gap-1.5 shrink-0 shadow-md"
                        >
                          <Plus className="w-4 h-4" /> Thêm bộ con mới
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub-Set Horizontal Navigation Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 custom-scrollbar">
                    {newSubFlashcardSets.map((sub, sIdx) => {
                      const isActive = sIdx === safeSubIndex;
                      const cardCount = sub.flashcards?.length || 0;

                      return (
                        <div key={sub.id || sIdx} className="flex items-center shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSubIndex(sIdx);
                              const targetCards = sub.flashcards || [];
                              setNewFlashcards(targetCards.length > 0 ? targetCards : [{ id: Date.now().toString(), front: '', back: '' }]);
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 border ${
                              isActive
                                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 border-amber-300 shadow-md scale-[1.02]'
                                : 'bg-white/10 hover:bg-white/20 text-indigo-100 border-white/15'
                            }`}
                          >
                            <span>📦 #{sIdx + 1} {sub.title || 'Bộ con'}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                              isActive ? 'bg-black/20 text-slate-900' : 'bg-black/30 text-indigo-200'
                            }`}>
                              {cardCount} thẻ
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Sub-set Settings Card */}
                  {currentSubSet && (
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">
                          Tên bộ con #{safeSubIndex + 1}:
                        </label>
                        <input
                          type="text"
                          value={currentSubSet.title}
                          onChange={(e) => {
                            if (setNewSubFlashcardSets && newSubFlashcardSets) {
                              const updated = [...newSubFlashcardSets];
                              updated[safeSubIndex] = { ...updated[safeSubIndex], title: e.target.value };
                              setNewSubFlashcardSets(updated);
                            }
                          }}
                          placeholder="Tên bộ con (VD: Từ vựng Bài 1)"
                          className="w-full px-3 py-1.5 bg-black/30 border border-white/20 rounded-lg text-xs text-white placeholder-indigo-300/60 font-bold outline-none focus:border-amber-300"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">
                          Mô tả bộ con #{safeSubIndex + 1}:
                        </label>
                        <input
                          type="text"
                          value={currentSubSet.description || ''}
                          onChange={(e) => {
                            if (setNewSubFlashcardSets && newSubFlashcardSets) {
                              const updated = [...newSubFlashcardSets];
                              updated[safeSubIndex] = { ...updated[safeSubIndex], description: e.target.value };
                              setNewSubFlashcardSets(updated);
                            }
                          }}
                          placeholder="Mô tả bộ con (không bắt buộc)"
                          className="w-full px-3 py-1.5 bg-black/30 border border-white/20 rounded-lg text-xs text-indigo-100 placeholder-indigo-300/60 outline-none focus:border-amber-300"
                        />
                      </div>

                      {/* Sub-set Position / Order Controls */}
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                          Thứ tự vị trí:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={safeSubIndex === 0}
                            onClick={() => moveSubSet(safeSubIndex, safeSubIndex - 1)}
                            className="p-1.5 bg-black/30 hover:bg-black/50 disabled:opacity-30 disabled:hover:bg-black/30 text-white rounded-lg border border-white/20 transition-colors"
                            title="Dời bộ này sang trước (về bên trái)"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>

                          <select
                            value={safeSubIndex}
                            onChange={(e) => moveSubSet(safeSubIndex, Number(e.target.value))}
                            className="flex-1 px-2.5 py-1.5 bg-black/40 border border-amber-400/40 rounded-lg text-xs text-amber-200 font-extrabold outline-none cursor-pointer"
                          >
                            {newSubFlashcardSets.map((_, idx) => (
                              <option key={idx} value={idx} className="bg-slate-900 text-white">
                                Vị trí #{idx + 1} {idx === 0 ? '(Đầu tiên)' : idx === newSubFlashcardSets.length - 1 ? '(Cuối cùng)' : ''}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={safeSubIndex === newSubFlashcardSets.length - 1}
                            onClick={() => moveSubSet(safeSubIndex, safeSubIndex + 1)}
                            className="p-1.5 bg-black/30 hover:bg-black/50 disabled:opacity-30 disabled:hover:bg-black/30 text-white rounded-lg border border-white/20 transition-colors"
                            title="Dời bộ này ra sau (về bên phải)"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="sm:col-span-1 flex items-end justify-end pt-1">
                        {setNewSubFlashcardSets && newSubFlashcardSets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Xóa bộ con "${currentSubSet.title}" khỏi bài học cha này?`)) {
                                const updated = newSubFlashcardSets.filter((_, idx) => idx !== safeSubIndex);
                                setNewSubFlashcardSets(updated);
                                const nextIdx = Math.max(0, safeSubIndex - 1);
                                setActiveSubIndex(nextIdx);
                                setNewFlashcards(updated[nextIdx].flashcards || [{ id: Date.now().toString(), front: '', back: '' }]);
                              }
                            }}
                            className="w-full py-1.5 px-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 border border-rose-400/30 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                            title="Xóa bộ con này"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-set Card Controls Bar (Only when editing parent/combined set) */}
              {hasSubSets && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-lg border border-indigo-200">
                      📦 #{safeSubIndex + 1} {currentSubSet?.title || 'Bộ con'}
                    </span>
                    <span className="text-xs font-extrabold text-slate-700">
                      ({newFlashcards.length} thẻ ghi nhớ)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button 
                      type="button"
                      onClick={() => setShowFlashcardPreview(true)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0"
                      title="Xem trước trình lật thẻ bộ con này"
                    >
                      <Play className="w-3.5 h-3.5" /> Preview bộ này
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBatchModal(true)}
                      className="px-3 py-1.5 bg-purple-50 text-purple-700 font-extrabold rounded-xl text-xs border border-purple-200 hover:bg-purple-100 flex items-center gap-1.5 transition-colors shrink-0 shadow-sm active:scale-95"
                      title="Ghép ảnh hàng loạt cho bộ con này"
                    >
                      <FolderOpen className="w-3.5 h-3.5" /> Ghép ảnh hàng loạt
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        if (window.confirm("⚠️ Xóa tất cả thẻ ghi nhớ của bộ con này?")) {
                          updateActiveCards([{ id: Date.now().toString(), front: '', back: '' }]);
                        }
                      }}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 flex items-center gap-1.5 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả
                    </button>
                    <button 
                      type="button" 
                      onClick={() => updateActiveCards([...newFlashcards, { id: Date.now().toString(), front: '', back: '' }])} 
                      className="px-3 py-1.5 bg-blue-600 text-white font-extrabold rounded-xl text-xs hover:bg-blue-700 flex items-center gap-1.5 transition-colors shadow-sm shrink-0 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm thẻ mới
                    </button>
                  </div>
                </div>
              )}

              {/* Guidance Banner (Only shown for SINGLE Flashcard sets, HIDDEN for Parent/Combined sets) */}
              {!hasSubSets && (
                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-950 flex items-start gap-2 shrink-0">
                  <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-extrabold text-indigo-900">Mẹo cho Giáo viên:</span> Có thể dùng nút <span className="font-bold text-purple-700">"Ghép ảnh hàng loạt"</span> để tải lên cùng lúc nhiều ảnh mặt trước (Folder 1, 2, 3) và mặt sau (Folder 1, 2, 3), hệ thống sẽ tự động bắt cặp khớp theo số thứ tự hoặc tên cực kỳ nhanh chóng và nhàn hạ!
                  </div>
                </div>
              )}

              {/* Scrolling List of Cards */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 pb-4 custom-scrollbar">
                {newFlashcards.map((card, index) => (
                  <div key={card.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative group hover:border-indigo-200 transition-colors">
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-md">Thẻ #{index + 1}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          if (newFlashcards.length > 1) {
                            updateActiveCards(newFlashcards.filter(c => c.id !== card.id));
                          } else {
                            alert('Bộ thẻ cần ít nhất 1 thẻ!');
                          }
                        }} 
                        className="p-1.5 bg-white text-rose-500 rounded-lg hover:bg-rose-50 border border-slate-200 transition-colors shadow-sm"
                        title="Xóa thẻ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Mặt trước (Câu hỏi / Từ vựng)</label>
                        <textarea 
                          value={card.front} 
                          onChange={(e) => updateActiveCards(newFlashcards.map(c => c.id === card.id ? { ...c, front: e.target.value } : c))} 
                          className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 resize-none h-20 bg-white" 
                          placeholder="Nhập nội dung mặt trước..." 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Mặt sau (Đáp án / Giải nghĩa)</label>
                        <textarea 
                          value={card.back} 
                          onChange={(e) => updateActiveCards(newFlashcards.map(c => c.id === card.id ? { ...c, back: e.target.value } : c))} 
                          className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 resize-none h-20 bg-white" 
                          placeholder="Nhập nội dung mặt sau..." 
                        />
                      </div>
                    </div>

                    {/* Symmetrical Image Section (Front & Back) */}
                    <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Front Image Option */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Image className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Ảnh mặt trước (Không bắt buộc)</span>
                        </label>
                        <div className="flex gap-1.5 items-center">
                          <input
                            type="text"
                            value={card.frontImage || card.image || ''}
                            onChange={(e) => updateActiveCards(newFlashcards.map(c => c.id === card.id ? { ...c, frontImage: e.target.value } : c))}
                            placeholder="Dán URL ảnh mặt trước..."
                            className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white font-medium"
                          />
                          <label className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer transition-colors" title="Tải ảnh lên">
                            <Upload className="w-3.5 h-3.5" />
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const base64 = await compressImage(file);
                                  updateActiveCards(newFlashcards.map(c => c.id === card.id ? { ...c, frontImage: base64 } : c));
                                }
                              }}
                            />
                          </label>
                          {(card.frontImage || card.image) && (
                            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center p-0.5 bg-white group/thumb">
                              <img src={card.frontImage || card.image} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                              <button type="button" onClick={() => updateActiveCards(newFlashcards.map(c => c.id === card.id ? { ...c, frontImage: '', image: '' } : c))} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Back Image Option */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Image className="w-3.5 h-3.5 text-purple-500" />
                          <span>Ảnh mặt sau (Không bắt buộc)</span>
                        </label>
                        <div className="flex gap-1.5 items-center">
                          <input
                            type="text"
                            value={card.backImage || ''}
                            onChange={(e) => updateActiveCards(newFlashcards.map(c => c.id === card.id ? { ...c, backImage: e.target.value } : c))}
                            placeholder="Dán URL ảnh mặt sau..."
                            className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white font-medium"
                          />
                          <label className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer transition-colors" title="Tải ảnh lên">
                            <Upload className="w-3.5 h-3.5" />
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const base64 = await compressImage(file);
                                  updateActiveCards(newFlashcards.map(c => c.id === card.id ? { ...c, backImage: base64 } : c));
                                }
                              }}
                            />
                          </label>
                          {card.backImage && (
                            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center p-0.5 bg-white group/thumb">
                              <img src={card.backImage} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                              <button type="button" onClick={() => updateActiveCards(newFlashcards.map(c => c.id === card.id ? { ...c, backImage: '' } : c))} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {flashcardSubStep === 2 && (
            <motion.div 
              key="flashcard-step-2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="flex-1 min-h-0 flex flex-col space-y-4 w-full"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-1 gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Bước 2</span>
                  <span className="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <span>📝</span> Mã nguồn câu hỏi kiểm tra Flashcard
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    {rawQuestionCode.split('\n').length} dòng
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setRawQuestionCode('')}
                    title="Xóa trắng mã nguồn câu hỏi"
                    className="p-1.5 px-3 text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa trắng</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowFlashcardQuizTest(true)} 
                    title="Xem trước bài kiểm tra trắc nghiệm flashcard"
                    className="px-4 sm:px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 border border-indigo-500 transition-all shadow-md shadow-indigo-100 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" /> Preview
                  </button>
                </div>
              </div>

              {/* Text Area */}
              <div className="flex-1 border border-slate-200 rounded-2xl bg-white overflow-hidden flex shadow-inner min-h-[220px]">
                <textarea
                  value={rawQuestionCode}
                  onChange={(e) => setRawQuestionCode(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi trắc nghiệm kiểm tra sau khi học..."
                  className="flex-1 w-full p-4 text-[12px] font-mono text-slate-800 outline-none resize-none leading-relaxed whitespace-pre font-medium"
                  spellCheck={false}
                />
              </div>

              {/* Templates */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shrink-0">
                <p className="text-[11px] font-bold text-slate-600">Nội dung mẫu đề thi:</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setRawQuestionCode(SAMPLE_TEMPLATES.mau1)} className="text-[11px] text-blue-600 font-bold hover:underline px-2 py-1 bg-white border border-blue-100 rounded-lg">Mẫu 1</button>
                  <button type="button" onClick={() => setRawQuestionCode(SAMPLE_TEMPLATES.mau2)} className="text-[11px] text-blue-600 font-bold hover:underline px-2 py-1 bg-white border border-blue-100 rounded-lg">Mẫu 2</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RENDER SMART BATCH PAIRING MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Sparkles className="w-5 h-5 text-purple-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-lg">Ghép Cặp & Nhập Kho Ảnh Hàng Loạt</h3>
                  <p className="text-white/85 text-[11px] font-medium">Tự động bắt cặp ảnh Mặt trước & Mặt sau theo tên file (ví dụ: 1.jpg ghép với 1.jpg)</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowBatchModal(false);
                  setFrontFiles([]);
                  setBackFiles([]);
                }} 
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload Front Folder Box */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-700 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[10px]">1</span>
                      Thư mục / Loạt ảnh MẶT TRƯỚC
                    </span>
                    {frontFiles.length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        Đã chọn {frontFiles.length} ảnh
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
                    Chọn tất cả ảnh của **mặt trước** (Có thể đặt tên chứa các số thứ tự: <code className="font-bold bg-slate-100 text-indigo-600 px-1 py-0.5 rounded text-[10px]">1.jpg</code>, <code className="font-bold bg-slate-100 text-indigo-600 px-1 py-0.5 rounded text-[10px]">2.jpg</code>, hoặc tên <code className="font-bold bg-slate-100 text-indigo-600 px-1 py-0.5 rounded text-[10px]">apple.png</code>).
                  </p>
                  
                  <div className="relative">
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*"
                      onChange={handleFrontFilesChange}
                      className="hidden" 
                      id="batch-front-uploader" 
                    />
                    <label 
                      htmlFor="batch-front-uploader"
                      onDrop={handleFrontDrop}
                      onDragOver={handleFrontDragOver}
                      onDragLeave={handleFrontDragLeave}
                      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${isDraggingFront ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/10'}`}
                    >
                      <Upload className="w-7 h-7 text-indigo-500 animate-bounce" />
                      <span className="text-xs font-bold text-slate-700">Chọn nhiều ảnh Mặt trước</span>
                      <span className="text-[10px] text-slate-400 font-medium">Hỗ trợ chọn hàng chục ảnh cùng lúc</span>
                    </label>
                  </div>
                </div>

                {/* Upload Back Folder Box */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-700 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-[10px]">2</span>
                      Thư mục / Loạt ảnh MẶT SAU
                    </span>
                    {backFiles.length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        Đã chọn {backFiles.length} ảnh
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
                    Chọn các ảnh tương ứng của **mặt sau** (Đặt tên trùng số thứ tự hoặc trùng tên tương ứng: <code className="font-bold bg-slate-100 text-purple-600 px-1 py-0.5 rounded text-[10px]">1.jpg</code>, <code className="font-bold bg-slate-100 text-purple-600 px-1 py-0.5 rounded text-[10px]">2.jpg</code>, <code className="font-bold bg-slate-100 text-purple-600 px-1 py-0.5 rounded text-[10px]">apple.png</code>).
                  </p>

                  <div className="relative">
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*"
                      onChange={handleBackFilesChange}
                      className="hidden" 
                      id="batch-back-uploader" 
                    />
                    <label 
                      htmlFor="batch-back-uploader"
                      onDrop={handleBackDrop}
                      onDragOver={handleBackDragOver}
                      onDragLeave={handleBackDragLeave}
                      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${isDraggingBack ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-purple-500 bg-slate-50/50 hover:bg-purple-50/10'}`}
                    >
                      <Upload className="w-7 h-7 text-purple-500 animate-bounce" />
                      <span className="text-xs font-bold text-slate-700">Chọn nhiều ảnh Mặt sau</span>
                      <span className="text-[10px] text-slate-400 font-medium">Chọn loạt ảnh đáp án</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Progress Indicator */}
              {isReadingFiles && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-slate-700">Đang đọc dữ liệu ảnh, vui lòng đợi giây lát...</span>
                </div>
              )}

              {/* Pairing Preview */}
              {pairedItems.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                      <Check className="w-4 h-4 text-emerald-500" />
                      Bản đồ ghép cặp dự kiến ({pairedItems.length} thẻ ghi nhớ)
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">
                      Tự bắt cặp theo số thứ tự trích xuất từ tên file
                    </span>
                  </div>

                  {/* List of Pairings */}
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 custom-scrollbar pr-1">
                    {pairedItems.map((item, idx) => {
                      return (
                        <div key={item.key} className="py-3 flex items-center justify-between gap-4 text-xs font-medium">
                          {/* Front Side Card Thumbnail Preview */}
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            {item.front ? (
                              <div className="w-10 h-10 border border-slate-200 bg-slate-50 p-0.5 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                                <img src={item.front.base64} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 border-2 border-dashed border-slate-200 rounded-lg shrink-0 flex items-center justify-center bg-slate-50 text-slate-300">
                                <QuestionIcon className="w-4 h-4" />
                              </div>
                            )}
                            <div className="truncate">
                              <span className="text-[10px] font-bold text-indigo-600 uppercase block">Trước</span>
                              <span className="text-slate-800 font-bold block truncate text-[11px]">{item.front ? item.front.name : '(Trống - Sẽ điền sau)'}</span>
                            </div>
                          </div>

                          {/* Arrow */}
                          <div className="flex flex-col items-center justify-center shrink-0">
                            <span className="text-[10px] font-black text-slate-400 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full">
                              Mã #{item.key}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 mt-1" />
                          </div>

                          {/* Back Side Card Thumbnail Preview */}
                          <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end text-right">
                            <div className="truncate">
                              <span className="text-[10px] font-bold text-purple-600 uppercase block">Sau</span>
                              <span className="text-slate-800 font-bold block truncate text-[11px]">{item.back ? item.back.name : '(Trống - Sẽ điền sau)'}</span>
                            </div>
                            {item.back ? (
                              <div className="w-10 h-10 border border-slate-200 bg-slate-50 p-0.5 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                                <img src={item.back.base64} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 border-2 border-dashed border-slate-200 rounded-lg shrink-0 flex items-center justify-center bg-slate-50 text-slate-300">
                                <QuestionIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                * Lưu ý: Tải lên hình ảnh trực tiếp dạng file Base64, không cần lưu trữ bên thứ ba.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBatchModal(false);
                    setFrontFiles([]);
                    setBackFiles([]);
                  }}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl text-xs transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={executeBatchImport}
                  disabled={pairedItems.length === 0 || isReadingFiles}
                  className={`px-5 py-2 font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 ${
                    pairedItems.length === 0 || isReadingFiles
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Xác nhận Ghép & Nhập ({pairedItems.length} thẻ)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* RENDER SELECT SUB-SET MODAL */}
      {showSelectSubSetModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-[10050] overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/30 rounded-xl border border-indigo-400/30">
                  <Layers className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">Thêm Bộ Thẻ Con Vào Bài Học Tổng Hợp</h3>
                  <p className="text-indigo-200/80 text-[11px]">
                    Chọn bộ Flashcard đã có trong danh sách hoặc tạo một bộ con mới từ đầu
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSelectSubSetModal(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Bar & Options */}
            <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
              {/* Primary Action Card: Create fresh blank sub-set */}
              <div 
                onClick={() => {
                  if (setNewSubFlashcardSets) {
                    const currentSets = newSubFlashcardSets || [];
                    const newSub: SubFlashcardSet = {
                      id: `sub_${Date.now()}`,
                      title: `Bộ con ${currentSets.length + 1}`,
                      description: '',
                      flashcards: [{ id: Date.now().toString(), front: '', back: '' }],
                      questions: []
                    };
                    const updated = [...currentSets, newSub];
                    setNewSubFlashcardSets(updated);
                    const newIdx = updated.length - 1;
                    setActiveSubIndex(newIdx);
                    setNewFlashcards(newSub.flashcards);
                  }
                  setShowSelectSubSetModal(false);
                }}
                className="bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border-2 border-dashed border-indigo-300 rounded-2xl p-4 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform shadow-sm">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-indigo-950">✨ Tạo bộ con mới trống từ đầu</h4>
                    <p className="text-[11px] text-indigo-700/80 mt-0.5">Tự nhập thủ công các thẻ ghi nhớ và câu hỏi cho bộ con mới này</p>
                  </div>
                </div>
                <span className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black group-hover:bg-indigo-700 transition-colors shadow-sm shrink-0">
                  + Tạo mới
                </span>
              </div>

              {/* Divider with Search Bar */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    📚 Danh sách bộ Flashcard sẵn có trong hệ thống ({availableAssignmentsForModal.length})
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={subsetSearchQuery}
                    onChange={(e) => setSubsetSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm bộ flashcard theo tên hoặc mô tả..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* List of Available Flashcard Assignments */}
              <div className="space-y-2.5">
                {availableAssignmentsForModal.length > 0 ? (
                  availableAssignmentsForModal.map(assignment => {
                    const cardCount = assignment.flashcards?.length || assignment.subFlashcardSets?.reduce((acc, s) => acc + (s.flashcards?.length || 0), 0) || 0;
                    return (
                      <div 
                        key={assignment.id}
                        className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all shadow-sm hover:shadow-md"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-md uppercase">
                              🎴 Flashcard
                            </span>
                            <h5 className="font-extrabold text-xs sm:text-sm text-slate-800 truncate">
                              {assignment.title}
                            </h5>
                          </div>
                          {assignment.description && (
                            <p className="text-[11px] text-slate-500 truncate mt-1">
                              {assignment.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 font-medium">
                            <span>{cardCount} thẻ ghi nhớ</span>
                            {assignment.questions && assignment.questions.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{assignment.questions.length} câu trắc nghiệm</span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (setNewSubFlashcardSets) {
                              const currentSets = newSubFlashcardSets || [];
                              
                              // If selected assignment itself has subFlashcardSets, unpack them!
                              if (assignment.subFlashcardSets && assignment.subFlashcardSets.length > 0) {
                                const unpacked: SubFlashcardSet[] = assignment.subFlashcardSets.map((s, idx) => ({
                                  id: s.id || `sub_${Date.now()}_${idx}`,
                                  title: s.title,
                                  description: s.description || '',
                                  flashcards: s.flashcards || [],
                                  questions: s.questions || []
                                }));
                                const updated = [...currentSets, ...unpacked];
                                setNewSubFlashcardSets(updated);
                                setActiveSubIndex(currentSets.length);
                                setNewFlashcards(unpacked[0]?.flashcards || []);
                              } else {
                                // Single flashcard set
                                const newSub: SubFlashcardSet = {
                                  id: assignment.id || `sub_${Date.now()}`,
                                  title: assignment.title,
                                  description: assignment.description || '',
                                  flashcards: assignment.flashcards || [{ id: Date.now().toString(), front: '', back: '' }],
                                  questions: assignment.questions || []
                                };
                                const updated = [...currentSets, newSub];
                                setNewSubFlashcardSets(updated);
                                setActiveSubIndex(updated.length - 1);
                                setNewFlashcards(newSub.flashcards);
                              }
                            }
                            setShowSelectSubSetModal(false);
                          }}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Thêm bộ này
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">Không tìm thấy bộ Flashcard phù hợp nào chưa chọn</p>
                    <p className="text-[11px] text-slate-400">Bạn có thể nhấp "Tạo bộ con mới từ đầu" ở trên để tự nhập thẻ mới.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* RENDER REORDER SUB-SETS MODAL */}
      {showReorderModal && hasSubSets && newSubFlashcardSets && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-[10050] overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/30 rounded-xl border border-amber-400/30">
                  <ArrowUpDown className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">Sắp Xếp Thứ Tự Các Bộ Thẻ Con</h3>
                  <p className="text-indigo-200/80 text-[11px]">
                    Điều chỉnh thứ tự hiển thị từ trước ra sau của các bộ con trong bài học tổng hợp
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowReorderModal(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List & Quick Reorder Controls */}
            <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
              <div className="flex items-center justify-between pb-1 text-xs text-slate-500 font-bold">
                <span>Danh sách ({newSubFlashcardSets.length} bộ con):</span>
                <button
                  type="button"
                  onClick={reverseAllSubSets}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-extrabold border border-indigo-200 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Đảo ngược toàn bộ
                </button>
              </div>

              <div className="space-y-2">
                {newSubFlashcardSets.map((sub, idx) => {
                  const cardCount = sub.flashcards?.length || 0;
                  const isCurrent = idx === safeSubIndex;

                  return (
                    <div 
                      key={sub.id || idx}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isCurrent 
                          ? 'bg-amber-50/80 border-amber-300 shadow-sm' 
                          : 'bg-white border-slate-200 hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          isCurrent ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-xs sm:text-sm text-slate-800 truncate">
                            {sub.title || `Bộ con ${idx + 1}`}
                          </h5>
                          <p className="text-[11px] text-slate-400 font-medium truncate">
                            {cardCount} thẻ ghi nhớ {sub.description ? `• ${sub.description}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Move controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveSubSet(idx, idx - 1)}
                          className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-inherit rounded-lg text-slate-600 border border-slate-200 transition-colors"
                          title="Di chuyển lên trên"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === newSubFlashcardSets.length - 1}
                          onClick={() => moveSubSet(idx, idx + 1)}
                          className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-inherit rounded-lg text-slate-600 border border-slate-200 transition-colors"
                          title="Di chuyển xuống dưới"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowReorderModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs sm:text-sm transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Hoàn tất sắp xếp
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
